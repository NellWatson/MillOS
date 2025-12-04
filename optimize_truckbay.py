#!/usr/bin/env python3
"""
Optimize TruckBay.tsx by:
1. Adding frame throttling to useFrame callbacks
2. Memoizing components
3. Consolidating animations where possible
"""

import re
import sys

def add_frame_throttling(content):
    """Add frame throttling to appropriate useFrame callbacks"""

    # Components that should have throttling
    # Particle effects: throttle=2 (30fps)
    particle_components = ['ExhaustSmoke']

    # Light effects: throttle=4 (15fps)
    light_components = ['DOTMarkerLights', 'DockStatusLight', 'TruckAlignmentGuides']

    # Slow animations: throttle=3 (20fps)
    slow_anim_components = ['RollUpDoor', 'DockShelter', 'DockLeveler', 'DockPlate',
                             'WheelChock', 'DockForklift', 'DockSpotter', 'WarehouseWorkerWithPalletJack',
                             'WeightScale', 'YardJockey', 'GuardShack', 'MudflapWithChains',
                             'AirHoseStation', 'ScaleTicketKiosk', 'StretchWrapMachine',
                             'PalletJackChargingStation', 'OverheadCrane', 'CardboardCompactor',
                             'IntercomCallBox', 'TruckWashStation', 'TimeClockStation']

    # Medium animations: throttle=2 (30fps)
    medium_anim_components = ['ReeferUnit']

    # Smooth animations: throttle=1 (60fps) - no change needed
    # smooth_components = ['RealisticTruck'] - main truck stays at 60fps

    # Add import for frame throttling
    import_pattern = r"(import \{ useFrame \} from '@react-three/fiber';)"
    import_replacement = r"\1\nimport { shouldRunThisFrame, incrementGlobalFrame } from '../utils/frameThrottle';"
    content = re.sub(import_pattern, import_replacement, content)

    # For each component type, add throttling
    for component in particle_components:
        content = add_throttle_to_component(content, component, 2)

    for component in light_components:
        content = add_throttle_to_component(content, component, 4)

    for component in slow_anim_components:
        content = add_throttle_to_component(content, component, 3)

    for component in medium_anim_components:
        content = add_throttle_to_component(content, component, 2)

    return content

def add_throttle_to_component(content, component_name, throttle_level):
    """Add throttling to a specific component's useFrame"""

    # Find the component and its useFrame
    # Pattern: const ComponentName: React.FC<...> = ... => {
    #   ...
    #   useFrame((state) => {
    #     ... code ...
    #   });

    # Create a pattern to find useFrame in this component
    # We'll look for useFrame and add throttling check at the start

    pattern = rf"(const {component_name}[^{{]*\{{[^}}]*?)(useFrame\(\([^)]*\) => \{{)"

    def replacer(match):
        before_useframe = match.group(1)
        useframe_start = match.group(2)

        # Add throttling check right after useFrame starts
        new_useframe = useframe_start + f"\n    if (!shouldRunThisFrame({throttle_level})) return;"

        return before_useframe + new_useframe

    content = re.sub(pattern, replacer, content, flags=re.DOTALL)

    return content

def memoize_static_components(content):
    """Wrap stable components with React.memo"""

    # Components that are mostly static (no animations or simple prop-based rendering)
    static_components = [
        'TrafficCone', 'SpeedBump', 'ConcreteBollard', 'FifthWheelCoupling',
        'GladHands', 'ICCReflectiveTape', 'SlidingTandemAxles', 'ManifestHolder',
        'FuelTank', 'AirTank', 'LandingGear', 'DEFTank', 'CBAntennaComponent',
        'SunVisor', 'TireInspectionArea', 'FuelIsland', 'NoIdlingSign',
        'PalletStaging', 'HeadlightBeam', 'LicensePlate', 'GrainCoLogo',
        'FlourExpressLogo', 'TPMSSensor', 'TrailerLockRods', 'TrailerSkirts',
        'DriverRestroom', 'TrailerDropYard', 'MaintenanceBay', 'DockBumperWithWear',
        'DockFloorMarkings', 'SafetyMirror', 'FireExtinguisherStation', 'HazmatPlacard',
        'DriverBreakRoom', 'EmployeeParking', 'PropaneTankCage', 'DumpsterArea'
    ]

    for component in static_components:
        # Pattern: const ComponentName: React.FC<Props> = (props) => (
        # or: const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => (
        pattern = rf"(const {component}: React\.FC<[^>]*> = )"

        # Check if already memoized
        check_pattern = rf"const {component}: React\.FC<[^>]*> = React\.memo\("
        if re.search(check_pattern, content):
            continue  # Already memoized

        replacement = r"\1React.memo("
        content = re.sub(pattern, replacement, content)

        # Now we need to close the React.memo() call
        # Find the component's closing
        # This is tricky - we need to find the matching closing for this component
        # For now, add a closing paren before the semicolon of the component
        # We'll look for the pattern: };\n followed by next component or export

        # Find where this component ends
        comp_start = content.find(f"const {component}:")
        if comp_start == -1:
            continue

        # Find the next component or export after this one
        next_comp_pattern = r"\n(const [A-Z]|export const TruckBay)"
        match = re.search(next_comp_pattern, content[comp_start + 50:])
        if match:
            comp_end_search = comp_start + 50 + match.start()
            # Find the last }; before this position
            section = content[comp_start:comp_end_search]
            # Find last occurrence of ); or }; that closes the component
            last_close = section.rfind("};")
            if last_close != -1:
                # Add closing paren for React.memo
                actual_pos = comp_start + last_close + 2
                content = content[:actual_pos] + ")" + content[actual_pos:]

    return content

def consolidate_main_useframe(content):
    """Add global frame increment to main TruckBay useFrame"""

    # Find the main TruckBay's useFrame (around line 2734)
    # Pattern: export const TruckBay: React.FC<TruckBayProps> = ({ productionSpeed }) => {
    #   ...
    #   useFrame((state, delta) => {
    #     const time = state.clock.elapsedTime;

    pattern = r"(useFrame\(\(state, delta\) => \{\s+const time = state\.clock\.elapsedTime;)"
    replacement = r"\1\n    incrementGlobalFrame(); // Track global frame for throttling"
    content = re.sub(pattern, replacement, content)

    return content

def main():
    input_file = sys.argv[1] if len(sys.argv) > 1 else '/Users/nellwatson/Documents/GitHub/Experiments/src/components/TruckBay.tsx'
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file

    with open(input_file, 'r') as f:
        content = f.read()

    print("Adding frame throttling...")
    content = add_frame_throttling(content)

    print("Consolidating main useFrame...")
    content = consolidate_main_useframe(content)

    print("Memoizing static components...")
    content = memoize_static_components(content)

    with open(output_file, 'w') as f:
        f.write(content)

    print(f"Optimization complete! Output written to {output_file}")

if __name__ == '__main__':
    main()
