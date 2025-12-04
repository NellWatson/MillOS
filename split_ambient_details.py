#!/usr/bin/env python3
"""
Script to split the massive AmbientDetails.tsx file into smaller focused components.
"""

import re
from pathlib import Path

# Read the source file
source_file = Path("src/components/AmbientDetails.tsx")
source_content = source_file.read_text()

# Extract imports from the original file
imports_match = re.search(r'(import .*?;.*?\n)+', source_content, re.DOTALL)
original_imports = imports_match.group(0) if imports_match else ""

# Component categorization based on patterns
categories = {
    "AtmosphericEffects.tsx": {
        "components": ["Cobweb", "RustStain", "OilPuddle", "RainPuddle", "RoofLeakPuddle",
                      "WindowCondensation", "CeilingWaterStain", "GodRays", "DustBunny"],
        "description": "Atmospheric and weather effects"
    },
    "FactoryProps.tsx": {
        "components": ["StackedPallets", "ToolRack", "HardHatHook", "CleaningEquipment",
                      "OilDrum", "GasCylinder", "Toolbox", "TrashBin", "CoffeeCup",
                      "Sawhorse", "MaintenanceCart", "VendingMachine", "TimeClockStation"],
        "description": "Static factory props and decorations"
    },
    "IndustrialDetails.tsx": {
        "components": ["CableTray", "DrainageGrate", "ExhaustFan", "ElectricalPanel",
                      "SwingingChain", "PressureGauge", "ValveWheel", "PASpeaker",
                      "AlarmBell", "LoadingDockDoor"],
        "description": "Industrial equipment and infrastructure"
    },
    "SafetyEquipment.tsx": {
        "components": ["SafetySign", "FireExtinguisherStation", "EmergencyShower",
                      "EyeWashStation", "EarPlugDispenser", "SafetyGogglesRack",
                      "FirstAidKit", "AccidentBoard"],
        "description": "Safety equipment and signage"
    },
    "ControlSystems.tsx": {
        "components": ["ControlPanel", "ControlPanelLED", "VibrationIndicator",
                      "FactoryWallClock", "OutOfOrderSign", "OpenedPanel"],
        "description": "Control panels and monitoring systems"
    },
    "PersonalItems.tsx": {
        "components": ["JacketOnHook", "UmbrellaCorner", "LunchBag", "WaterBottle",
                      "FoldedNewspaper", "CigaretteButts", "StuckGum", "StickyNote",
                      "ScatteredPens", "ExtensionCord"],
        "description": "Personal items and micro-details"
    },
    "AmbientLife.tsx": {
        "components": ["Pigeon", "Mouse", "Flies", "Spider", "MothSwarm", "Cockroach"],
        "description": "Ambient creatures and wildlife"
    },
    "DecorativeElements.tsx": {
        "components": ["Graffiti", "BulletinBoard", "ScorchMark", "ChalkOutline",
                      "EmployeeOfMonth", "OldRadio", "BirthdayDecorations",
                      "WallCalendar"],
        "description": "Decorative and storytelling elements"
    }
}

def extract_component(component_name):
    """Extract a component definition from the source content."""
    # Pattern to match component definition
    patterns = [
        rf'(//.*{component_name}.*?\n)?((?:export )?const {component_name}:.*?)\n(?=\n(?:export )?(?:const|//|export default))',
        rf'(//.*{component_name}.*?\n)?((?:export )?const {component_name}:.*?)\n(?=\}};\n)',
    ]

    for pattern in patterns:
        match = re.search(pattern, source_content, re.DOTALL)
        if match:
            comment = match.group(1) or ""
            code = match.group(2)
            return comment + code + "\n};\n"

    return None

def create_category_file(filename, components, description):
    """Create a component file for a category."""
    output_path = Path(f"src/components/ambient/{filename}")

    # Build the file content
    content = original_imports + "\n"
    content += f"// {description}\n\n"

    extracted_count = 0
    for component_name in components:
        component_code = extract_component(component_name)
        if component_code:
            content += component_code + "\n"
            extracted_count += 1
        else:
            print(f"Warning: Could not extract component '{component_name}'")

    if extracted_count > 0:
        output_path.write_text(content)
        print(f"Created {filename} with {extracted_count}/{len(components)} components")
        return True
    return False

# Create output directory
Path("src/components/ambient").mkdir(exist_ok=True)

# Create category files
for filename, config in categories.items():
    create_category_file(filename, config["components"], config["description"])

print("\nSplit complete! Files created in src/components/ambient/")
