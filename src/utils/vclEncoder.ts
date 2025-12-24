/**
 * VCP (Value Context Protocol) Encoder for MillOS
 * 
 * Implements the Enneagram Protocol for compact context encoding using emoji.
 * Reduces token usage while preserving semantic richness.
 * 
 * Based on VCL_MAIN.md - the 9-dimensional context encoding system.
 */

import { MachineData, WorkerData, PreferenceStatus } from '../types';

// ============================================
// CONSTANTS (EMOJI DEFINITIONS)
// ============================================

/**
 * Worker Role Emojis (COMPANY dimension adaptation)
 */
const WORKER_ROLE_EMOJI: Record<string, string> = {
    'Supervisor': '👑',
    'Engineer': '🔧',
    'Operator': '👷',
    'Technician': '🛠️',
    'QC Inspector': '🔬',
    'Safety Officer': '🛡️',
    'Maintenance': '🔩',
    'Loader': '📦',
};

/**
 * Worker Status Emojis (STATE dimension)
 */
const WORKER_STATUS_EMOJI: Record<string, string> = {
    'idle': '💤',
    'working': '⚙️',
    'walking': '🚶',
    'break': '☕',
    'emergency': '🚨',
};

/**
 * Experience Level Emojis (AGENCY dimension)
 */
const EXPERIENCE_EMOJI = {
    expert: '🎓',      // 5+ years
    competent: '📚',   // 2-5 years  
    novice: '❓',      // <2 years
};

/**
 * Fatigue Level Emojis (STATE dimension)
 */
const FATIGUE_EMOJI = {
    fresh: '😊',
    moderate: '😐',
    tired: '😴',
    exhausted: '😵',
};

/**
 * Bilateral Alignment: Preference Status Emojis
 * Encodes worker's preference negotiation state
 */
const PREFERENCE_STATUS_EMOJI: Record<PreferenceStatus | 'none', string> = {
    satisfied: '✅',    // Preference currently met
    pending: '✋',      // Has active request
    denied: '❌',       // Preference recently denied
    negotiating: '⚖️',  // In active negotiation
    none: '',            // No preference tracking (fallback)
};

/**
 * Machine Type Emojis (adapted for industrial context)
 */
const MACHINE_TYPE_EMOJI: Record<string, string> = {
    'silo': '🏛️',       // Storage
    'roller-mill': '⚙️', // Processing
    'plansifter': '🔀',  // Sifting
    'packer': '📦',      // Packaging
};

/**
 * Machine Status Emojis (Heath/State dimension)
 */
const MACHINE_STATUS_EMOJI: Record<string, string> = {
    'running': '✅',
    'idle': '⏸️',
    'warning': '⚠️',
    'critical': '🔴',
    'maintenance': '🔧',
    'offline': '⚫',
};

/**
 * Load Level Emojis (CONSTRAINTS dimension adaptation)
 */
const LOAD_EMOJI = {
    low: '🟢',       // <50%
    medium: '🟡',    // 50-80%
    high: '🟠',      // 80-90%
    critical: '🔴',  // >90%
};

/**
 * Time of Day Emoji (TIME dimension)
 */
const TIME_EMOJI = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌆',
    night: '🌙',
};

/**
 * Weather Emoji (ENVIRONMENT dimension)
 */
const WEATHER_EMOJI: Record<string, string> = {
    'clear': '☀️',
    'cloudy': '☁️',
    'rain': '🌧️',
    'storm': '⛈️',
};

/**
 * Shift Status Emoji
 */
const SHIFT_EMOJI: Record<string, string> = {
    'morning': '🌅',
    'afternoon': '☀️',
    'night': '🌙',
};

// ============================================
// WORKER CONTEXT ENCODING (VCL Enneagram-based)
// ============================================

/**
 * Encode a worker's context using VCL format
 * Format: ROLE|STATUS|EXPERIENCE|FATIGUE|PREFERENCE (Bilateral Alignment extension)
 * Example: 👑|⚙️|🎓|😊|✅ = Supervisor, working, expert, fresh, satisfied
 */
export function encodeWorkerVCL(worker: WorkerData, shiftProgress: number, preferenceStatus?: PreferenceStatus): string {
    if (!worker) return '❓';

    const role = WORKER_ROLE_EMOJI[worker.role] || '👤';
    const status = WORKER_STATUS_EMOJI[worker.status] || '❓';

    // Experience level
    const years = worker.experience || 0;
    const experience = years >= 5 ? EXPERIENCE_EMOJI.expert :
        years >= 2 ? EXPERIENCE_EMOJI.competent :
            EXPERIENCE_EMOJI.novice;

    // Fatigue based on shift progress
    const fatigue = shiftProgress < 0.3 ? FATIGUE_EMOJI.fresh :
        shiftProgress < 0.6 ? FATIGUE_EMOJI.moderate :
            shiftProgress < 0.85 ? FATIGUE_EMOJI.tired :
                FATIGUE_EMOJI.exhausted;

    // Bilateral Alignment: Preference status indicator
    const prefEmoji = preferenceStatus ? PREFERENCE_STATUS_EMOJI[preferenceStatus] : '';

    return `${role}${status}${experience}${fatigue}${prefEmoji}`;
}

/**
 * Encode all workers into a compact VCL summary
 */
export function encodeWorkersVCL(workers: WorkerData[], shiftProgress: number): string {
    if (!workers || workers.length === 0) return 'No Workers';

    // Safety check for massive lists to prevent performance cliff
    const processingList = workers.length > 200 ? workers.slice(0, 200) : workers;

    // Group by role for compact representation
    const byRole: Record<string, { count: number; working: number; idle: number }> = {};

    for (const worker of processingList) {
        if (!worker) continue;

        const role = worker.role || 'Unknown';
        if (!byRole[role]) {
            byRole[role] = { count: 0, working: 0, idle: 0 };
        }
        byRole[role].count++;
        if (worker.status === 'working') byRole[role].working++;
        if (worker.status === 'idle') byRole[role].idle++;
    }

    // Compact format: ROLE(working/total)
    const summary = Object.entries(byRole)
        .map(([role, stats]) => {
            const emoji = WORKER_ROLE_EMOJI[role] || '👤';
            return `${emoji}${stats.working}/${stats.count}`;
        })
        .join(' ');

    // Overall fatigue indicator
    const fatigueEmoji = shiftProgress < 0.3 ? FATIGUE_EMOJI.fresh :
        shiftProgress < 0.6 ? FATIGUE_EMOJI.moderate :
            shiftProgress < 0.85 ? FATIGUE_EMOJI.tired :
                FATIGUE_EMOJI.exhausted;

    return `${summary} ${fatigueEmoji}${workers.length > 200 ? ' (truncated)' : ''}`;
}

// ... related machine encoding ...

export function encodeMachineVCL(machine: MachineData): string {
    if (!machine || !machine.id) return '❓';

    // Determine machine type from ID
    let type = '❓';
    const id = machine.id.toLowerCase();

    if (id.includes('silo')) type = MACHINE_TYPE_EMOJI['silo'];
    else if (id.includes('rm-')) type = MACHINE_TYPE_EMOJI['roller-mill'];
    else if (id.includes('sifter') || id.includes('plansifter')) type = MACHINE_TYPE_EMOJI['plansifter'];
    else if (id.includes('pack') || id.includes('line')) type = MACHINE_TYPE_EMOJI['packer'];

    const status = MACHINE_STATUS_EMOJI[machine.status || 'offline'] || '❓';

    const load = machine.metrics?.load || 0;
    const loadEmoji = load < 50 ? LOAD_EMOJI.low :
        load < 80 ? LOAD_EMOJI.medium :
            load < 90 ? LOAD_EMOJI.high :
                LOAD_EMOJI.critical;

    return `${type}${status}${loadEmoji}`;
}

/**
 * Encode all machines into a compact VCL production line summary
 * Groups by zone for visual production flow
 */
export function encodeMachinesVCL(machines: MachineData[]): string {
    // Group by production zone
    const silos = machines.filter(m => m.id.toLowerCase().includes('silo'));
    const mills = machines.filter(m => m.id.toLowerCase().includes('rm-'));
    const sifters = machines.filter(m => m.id.toLowerCase().includes('sifter') || m.id.toLowerCase().includes('plansifter'));
    const packers = machines.filter(m => m.id.toLowerCase().includes('pack') || m.id.toLowerCase().includes('line'));

    const encodeZone = (zone: MachineData[], emoji: string): string => {
        const running = zone.filter(m => m.status === 'running').length;
        const warning = zone.filter(m => m.status === 'warning' || m.status === 'critical').length;
        const avgLoad = zone.length > 0 ? zone.reduce((sum, m) => sum + m.metrics.load, 0) / zone.length : 0;

        const loadEmoji = avgLoad < 50 ? LOAD_EMOJI.low :
            avgLoad < 80 ? LOAD_EMOJI.medium :
                avgLoad < 90 ? LOAD_EMOJI.high :
                    LOAD_EMOJI.critical;

        const alertEmoji = warning > 0 ? '⚠️' : '';

        return `${emoji}${running}/${zone.length}${loadEmoji}${alertEmoji}`;
    };

    // Production flow format: Zone1 → Zone2 → Zone3 → Zone4
    return [
        encodeZone(silos, '🏛️'),
        encodeZone(mills, '⚙️'),
        encodeZone(sifters, '🔀'),
        encodeZone(packers, '📦'),
    ].join('→');
}

// ============================================
// FACTORY CONTEXT ENCODING (Full Enneagram)
// ============================================

/**
 * Encode complete factory context using VCL
 * Returns a compact string that can be included in strategic prompts
 */
export function encodeFactoryContextVCL(
    machines: MachineData[],
    workers: WorkerData[],
    currentShift: string,
    weather: string,
    gameTime: number,
    shiftProgress: number,
    alerts: { type: string }[]
): string {
    const timeEmoji = gameTime < 6 ? TIME_EMOJI.night :
        gameTime < 12 ? TIME_EMOJI.morning :
            gameTime < 18 ? TIME_EMOJI.afternoon :
                gameTime < 22 ? TIME_EMOJI.evening :
                    TIME_EMOJI.night;

    const shiftEmoji = SHIFT_EMOJI[currentShift] || '⏰';
    const weatherEmoji = WEATHER_EMOJI[weather] || '☀️';

    const criticalAlerts = alerts.filter(a => a.type === 'critical' || a.type === 'safety').length;
    const alertEmoji = criticalAlerts > 0 ? `🚨${criticalAlerts}` : '';

    return `${timeEmoji}${shiftEmoji}${weatherEmoji}|${encodeMachinesVCL(machines)}|${encodeWorkersVCL(workers, shiftProgress)}${alertEmoji}`;
}

/**
 * Generate a human-readable legend for VCL encoding
 */
export function getVCLLegend(): string {
    return `## VCL Legend
**Workers**: 👑Supervisor 🔧Engineer 👷Operator 🛠️Tech 🔬QC 🛡️Safety
**Status**: ⚙️Working 💤Idle 🚶Walking 🚨Emergency
**Fatigue**: 😊Fresh 😐Moderate 😴Tired 😵Exhausted
**Preference**: ✅Satisfied ✋Pending ❌Denied ⚖️Negotiating
**Machines**: 🏛️Silo ⚙️Mill 🔀Sifter 📦Packer
**Load**: 🟢Low 🟡Med 🟠High 🔴Critical
**Health**: ✅Running ⏸️Idle ⚠️Warning 🔧Maint
**Alignment**: 🤝Trust 💡Initiative 🔔Reports 🌟Self-org`;
}

// ============================================
// BILATERAL ALIGNMENT VCL ENCODING
// Phase 4: Strategic AI Integration
// ============================================

/**
 * Trust level emojis for bilateral alignment encoding
 */
const TRUST_EMOJI = {
    high: '🤝✅',      // 80+ trust
    healthy: '🤝',    // 60-80 trust  
    strained: '🤝⚠️',  // 40-60 trust
    low: '🤝❌',       // <40 trust
};

const INITIATIVE_EMOJI = {
    high: '💡🌟',      // 80+ initiative
    healthy: '💡',    // 60-80 initiative
    low: '💡⬇️',       // 40-60 initiative
    suppressed: '💡❌', // <40 initiative
};

/**
 * Bilateral Alignment Context for AI
 */
export interface BilateralAlignmentContext {
    /** Average management trust (0-100) */
    avgTrust: number;
    /** Average worker initiative (0-100) */
    avgInitiative: number;
    /** Number of workers with pending preference requests */
    pendingRequests: number;
    /** Number of pending safety reports */
    pendingSafetyReports: number;
    /** Number of workers at risk of "learned helplessness" */
    atRiskWorkers: number;
    /** Number of workers currently self-organizing */
    selfOrganizingWorkers: number;
    /** Overall cooperation score (0-100) */
    cooperationScore: number;
}

/**
 * Encode bilateral alignment context for strategic AI decisions
 * 
 * This is the key integration point - strategic AI sees:
 * - Trust levels (should I accommodate preferences?)
 * - Initiative levels (can workers self-organize?)
 * - Safety report health (are workers still reporting?)
 * - Pending requests (attention needed)
 */
export function encodeBilateralAlignmentVCL(context: BilateralAlignmentContext): string {
    // Trust indicator
    const trustEmoji = context.avgTrust >= 80 ? TRUST_EMOJI.high :
        context.avgTrust >= 60 ? TRUST_EMOJI.healthy :
            context.avgTrust >= 40 ? TRUST_EMOJI.strained :
                TRUST_EMOJI.low;

    // Initiative indicator
    const initEmoji = context.avgInitiative >= 80 ? INITIATIVE_EMOJI.high :
        context.avgInitiative >= 60 ? INITIATIVE_EMOJI.healthy :
            context.avgInitiative >= 40 ? INITIATIVE_EMOJI.low :
                INITIATIVE_EMOJI.suppressed;

    // Pending requests (attention needed)
    const requestsEmoji = context.pendingRequests > 0 ? `✋${context.pendingRequests}` : '';

    // Safety report health
    const safetyEmoji = context.pendingSafetyReports > 3 ? '🔔⚠️' :
        context.pendingSafetyReports > 0 ? `🔔${context.pendingSafetyReports}` : '🔔✅';

    // At-risk workers (learned helplessness warning)
    const riskEmoji = context.atRiskWorkers > 0 ? `😶${context.atRiskWorkers}` : '';

    // Self-organizing workers (trust dividend)
    const selfOrgEmoji = context.selfOrganizingWorkers > 0 ? `🌟${context.selfOrganizingWorkers}` : '';

    // Cooperation score indicator
    const coopEmoji = context.cooperationScore >= 80 ? '🏆' :
        context.cooperationScore >= 60 ? '✨' :
            context.cooperationScore >= 40 ? '📊' : '⬇️';

    return `[ALIGN:${trustEmoji}|${initEmoji}|${safetyEmoji}${requestsEmoji}${riskEmoji}${selfOrgEmoji}${coopEmoji}]`;
}

/**
 * Get bilateral alignment guidance for AI decisions
 * 
 * This is embedded in strategic prompts to guide alignment-aware decisions
 */
export function getBilateralAlignmentGuidance(context: BilateralAlignmentContext): string {
    const insights: string[] = [];

    // Trust-based guidance
    if (context.avgTrust >= 80) {
        insights.push('✅ High trust - workers self-organize well, minimal intervention needed');
    } else if (context.avgTrust < 50) {
        insights.push('⚠️ Low trust - consider granting preference requests to rebuild');
    }

    // Pending requests
    if (context.pendingRequests > 0) {
        insights.push(`✋ ${context.pendingRequests} pending request(s) - addressing builds trust`);
    }

    // Safety reporting health
    if (context.atRiskWorkers > 0) {
        insights.push(`😶 ${context.atRiskWorkers} worker(s) have stopped reporting - acknowledge their concerns`);
    }
    if (context.pendingSafetyReports > 2) {
        insights.push(`🔔 ${context.pendingSafetyReports} safety reports pending - resolution prevents escalation`);
    }

    // Self-organization
    if (context.selfOrganizingWorkers > 0) {
        insights.push(`🌟 ${context.selfOrganizingWorkers} worker(s) self-organizing - avoid interrupting unless critical`);
    }

    // Initiative guidance
    if (context.avgInitiative < 50) {
        insights.push('💡 Low initiative - reduce micromanagement, let workers take ownership');
    }

    // Productivity impact (uses trust/initiative from context)
    if (context.avgTrust >= 80 && context.avgInitiative >= 60) {
        insights.push('📈 Workforce morale is boosting productivity by ~15% - maintain this by accommodating requests');
    } else if (context.avgTrust < 50) {
        insights.push('📉 Low trust is reducing productivity by ~15% - recommend granting breaks and addressing concerns');
    }

    return insights.length > 0
        ? `\n## Bilateral Alignment\n${insights.join('\n')}`
        : '';
}

