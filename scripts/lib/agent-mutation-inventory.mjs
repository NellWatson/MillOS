import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import ts from 'typescript';

const READ_ONLY_METHODS = new Set([
  'createDiagnosticExport',
  'getAchievement',
  'getAchievementsByCategory',
  'getActiveAnnouncements',
  'getActiveProductionPlan',
  'getAnnouncementsByPriority',
  'getBatchTrace',
  'getCurrentFrame',
  'getDecisionsAt',
  'getFormattedCost',
  'getFrameCount',
  'getIncidentEffect',
  'getLatestTestResult',
  'getProductionMultiplier',
  'getTimeUntilNextArrival',
  'getUnlockedAchievements',
  'isAnyTruckDocked',
]);

const PRESENTATION_STORES = new Set([
  'useAIConfigStore',
  'useCameraStore',
  'useFPSStore',
  'useGraphicsStore',
  'useMobileControlStore',
  'useUIStore',
]);

const EVIDENCE_STORES = new Set(['useHistoricalPlaybackStore', 'useIncidentReplayStore']);

const OPERATIONAL_METHODS = new Set([
  'acknowledgePredictiveAlert',
  'completeQCTest',
  'confirmMachineRestart',
  'consumeTruckArrival',
  'incrementBagsProduced',
  'performMaintenance',
  'recordTruckDeparture',
  'resolveContaminationAlert',
  'resolveEmergency',
  'restockDelivery',
  'setForkliftEmergencyStop',
  'setTruckActive',
  'setTruckDocked',
  'setTruckLifecycle',
  'setTruckTransferReady',
  'startQCTest',
  'triggerBreakdown',
  'triggerContaminationAlert',
  'triggerEmergency',
  'updateCertificationStatus',
]);

const excludedDirectories = new Set(['0.10 Archive', 'node_modules']);
const testPathPattern =
  /(?:\/__tests__\/|\/__mocks__\/|\/src\/test\/|\.(?:test|spec|bench)\.[tj]sx?$)/;

export function buildDirectStoreCallInventory(rootDirectory) {
  const sourceRoot = resolve(rootDirectory, 'src');
  const files = collectSources(sourceRoot).filter((file) => !testPathPattern.test(file));
  const calls = [];

  for (const file of files) {
    const sourceText = readFileSync(file, 'utf8');
    const source = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const visit = (node) => {
      const call = directGetStateMethodCall(node);
      if (call) {
        const location = source.getLineAndCharacterOfPosition(node.getStart(source));
        const sourcePath = relative(rootDirectory, file).split('\\').join('/');
        const readOnly = READ_ONLY_METHODS.has(call.method);
        calls.push({
          store: call.store,
          method: call.method,
          sourcePath,
          line: location.line + 1,
          mutation: !readOnly,
          classification: readOnly
            ? 'read-only'
            : classifyMutation(call.store, call.method, sourcePath),
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  calls.sort((left, right) =>
    `${left.sourcePath}\u0000${String(left.line).padStart(8, '0')}\u0000${left.store}\u0000${left.method}`.localeCompare(
      `${right.sourcePath}\u0000${String(right.line).padStart(8, '0')}\u0000${right.store}\u0000${right.method}`
    )
  );

  const classificationCounts = {};
  for (const call of calls) {
    classificationCounts[call.classification] =
      (classificationCounts[call.classification] ?? 0) + 1;
  }

  return {
    schemaVersion: 1,
    scope: {
      included: 'Non-test TypeScript and JavaScript direct use*Store.getState().method() calls.',
      excluded:
        'Selector-extracted actions, getState aliases, internal Zustand set() calls, and dynamic property access.',
      purpose:
        'Inventory direct imperative coupling. Capability-specific symbol searches close the selected-slice gap.',
    },
    directCallCount: calls.length,
    directMutationCount: calls.filter((call) => call.mutation).length,
    classificationCounts: Object.fromEntries(
      Object.entries(classificationCounts).sort(([left], [right]) => left.localeCompare(right))
    ),
    calls,
  };
}

function collectSources(directory, output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name))
        collectSources(resolve(directory, entry.name), output);
    } else if (/\.[tj]sx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      output.push(resolve(directory, entry.name));
    }
  }
  return output;
}

function directGetStateMethodCall(node) {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return null;
  const getStateCall = node.expression.expression;
  if (
    !ts.isCallExpression(getStateCall) ||
    !ts.isPropertyAccessExpression(getStateCall.expression)
  ) {
    return null;
  }
  if (getStateCall.expression.name.text !== 'getState') return null;
  const store = getStateCall.expression.expression;
  if (!ts.isIdentifier(store) || !/^use[A-Za-z0-9_]+Store$/.test(store.text)) return null;
  return { store: store.text, method: node.expression.name.text };
}

function classifyMutation(store, method, sourcePath) {
  if (sourcePath === 'src/store.ts' || sourcePath === 'src/stores/productionStore.ts') {
    return 'compatibility';
  }
  if (EVIDENCE_STORES.has(store) || sourcePath === 'src/components/RuntimeController.tsx') {
    return 'diagnostic';
  }
  if (PRESENTATION_STORES.has(store)) {
    return store === 'useCameraStore' || store === 'useFPSStore' ? 'render-only' : 'ui-preference';
  }
  if (
    sourcePath === 'src/systems/UnifiedGameTick.ts' ||
    sourcePath.endsWith('gameSimulationStore.ts')
  ) {
    return 'cross-domain-coordination';
  }
  if (OPERATIONAL_METHODS.has(method) || sourcePath.startsWith('src/components/')) {
    return 'operational-command-candidate';
  }
  if (sourcePath.startsWith('src/stores/')) return 'domain-internal';
  return 'cross-domain-coordination';
}
