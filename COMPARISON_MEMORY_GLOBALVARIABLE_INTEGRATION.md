# Comparison Memory - GlobalVariable Integration

## Summary
Successfully integrated GlobalVariable support into Comparison Memory functionality, following the same pattern as TimeoutMemory.

## Changes Made

### Backend (Core Library)

1. **Model Updates** (`Core/Core/Models/ComparisonMemory.cs`)
   - Added `ComparisonSourceType` enum (Point = 0, GlobalVariable = 1)
   - Added `OutputType` property (int, default 0 for Point)
   - Added `OutputReference` property (string, stores GlobalVariable name or Point ID)
   - Marked `OutputItemId` as `[Obsolete]` for backward compatibility
   - Updated `ComparisonGroup` with `InputType` and `InputReferences`
   - Marked `InputItemIds` as `[Obsolete]` for backward compatibility

2. **Database Migration** (`Core/Core/Migrations/20260107192257_AddComparisonMemoryGlobalVariableSupport.cs`)
   - Added `output_type` column (integer, default 0)
   - Added `output_reference` column (text, nullable)
   - SQL migration script to copy existing `output_item_id` to `output_reference`
   - Migration applied successfully

3. **Business Logic** (`Core/Core/ComparisonMemories.cs`)
   - Updated validation for both Point and GlobalVariable output types
   - Validates GlobalVariable exists and is not disabled
   - Validates GlobalVariable VariableType is Boolean for digital comparisons
   - Backward compatibility maintained for old data using InputItemIds

4. **Processing Engine** (`Core/Core/ComparisonMemoryProcess.cs`)
   - Fetches GlobalVariable values directly from Redis
   - Uses key pattern: `GlobalVariable:{name}`
   - Deserializes using Newtonsoft.Json (matches Redis format)
   - Writes results to GlobalVariables using `GlobalVariableProcess.SetVariable()`
   - Handles mixed source types (Points and GlobalVariables in same configuration)

### Backend (EMS API)

5. **DTOs** (`EMS/API/Models/Dto/*.cs`)
   - `AddComparisonMemoryRequestDto`: Added `outputType` and `outputReference`
   - `EditComparisonMemoryRequestDto`: Added `outputType` and `outputReference`
   - `GetComparisonMemoriesResponseDto.ComparisonMemory`: Added `outputType` and `outputReference`
   - Kept `outputItemId` for backward compatibility

6. **API Controllers** (`EMS/API/Controllers/MonitoringController.cs`)
   - `AddComparisonMemory`: Maps `outputType` and `outputReference` from DTO
   - `EditComparisonMemory`: Maps `outputType` and `outputReference` from DTO
   - `GetComparisonMemories`: Maps `outputType` and `outputReference` to DTO

### Frontend (React/TypeScript)

7. **TypeScript Types** (`ui/src/types/api.ts`)
   - Updated `ComparisonMemory` interface with `outputType` and `outputReference`
   - Updated `AddComparisonMemoryRequestDto` interface
   - Updated `EditComparisonMemoryRequestDto` interface

8. **Add/Edit Dialog** (`ui/src/components/AddEditComparisonMemoryDialog.tsx`)
   - Added state for GlobalVariable list and selection
   - Added `ToggleButtonGroup` for output type selection (Point/GlobalVariable)
   - Added dual Autocomplete components:
     - Digital output items for Point type
     - GlobalVariables (Boolean type) for GlobalVariable type
   - Icons: MemoryIcon for Point, FunctionsIcon for GlobalVariable
   - Updated form submission to include `outputType` and `outputReference`
   - Added fetching of GlobalVariables using `getGlobalVariables()` API

9. **Management Page** (`ui/src/components/ComparisonMemoryManagementPage.tsx`)
   - Updated interface to use `outputSourceName` and `outputSourceType`
   - Enhanced `fetchMemories` to check `outputType` and lookup appropriate source
   - Display logic:
     - Point (type 0): Lookup name from items array
     - GlobalVariable (type 1): Display outputReference directly
   - Added `Chip` component to show source type badge (Point/GlobalVariable)
   - Updated search filter to include GlobalVariable names
   - Grid column displays both name and type badge

10. **Translations** (`ui/public/locales/*/translation.json`)
    - English (`en/translation.json`):
      - `comparisonMemory.outputSource`: "Output Source"
      - `comparisonMemory.outputItem`: "Output Point"
      - `comparisonMemory.outputGlobalVariable`: "Output Global Variable"
      - `comparisonMemory.outputGlobalVariableHelp`: Help text
      - `comparisonMemory.validation.outputRequired`: "Output source is required"
      - `common.point`: "Point"
      - `common.globalVariable`: "Global Variable"
    
    - Persian (`fa/translation.json`):
      - `comparisonMemory.outputSource`: "منبع خروجی"
      - `comparisonMemory.outputItem`: "نقطه خروجی"
      - `comparisonMemory.outputGlobalVariable`: "متغیر سراسری خروجی"
      - `comparisonMemory.outputGlobalVariableHelp`: Help text in Persian
      - `comparisonMemory.validation.outputRequired`: "منبع خروجی الزامی است"
      - `common.point`: "نقطه"
      - `common.globalVariable`: "متغیر سراسری"

## Testing Status

### Build Status
- ✅ Core library builds successfully
- ✅ EMS API builds successfully (3 warnings about deprecated AverageMemory fields - unrelated)
- ✅ Frontend compiles with no errors
- ✅ Database migration applied successfully

### Functionality Testing
- ✅ UI running at http://localhost:5173
- ✅ Comparison Memory page accessible
- ⚠️ Manual testing required:
  - Create comparison memory with GlobalVariable output
  - Edit existing comparison memory to change output type
  - Verify backend processing writes to GlobalVariables
  - Test search/filter functionality
  - Verify backward compatibility with existing data

## Backward Compatibility

The implementation maintains full backward compatibility:
- Old `outputItemId` field still works (marked as Obsolete)
- Old `inputItemIds` field still works (marked as Obsolete)
- Database migration preserves existing data
- New `outputType` defaults to 0 (Point) for existing records
- Processing engine checks both old and new fields

## API Endpoints

All existing endpoints updated to support new fields:
- `POST /api/Monitoring/AddComparisonMemory`
- `POST /api/Monitoring/EditComparisonMemory`
- `POST /api/Monitoring/GetComparisonMemories`

## Redis Integration

GlobalVariable values fetched from Redis:
- Key pattern: `GlobalVariable:{name}`
- Deserialize using `Newtonsoft.Json.JsonConvert`
- Matches format used by `GlobalVariableProcess`

## Next Steps

1. Manual testing of the full workflow:
   - Create new comparison memory with GlobalVariable output
   - Edit existing comparison memory
   - Verify processing engine writes to GlobalVariables
   - Test with multiple source types in same configuration

2. Monitor logs for any runtime errors

3. Verify GlobalVariable values update correctly in Redis

## Related Files

### Backend
- `Core/Core/Models/ComparisonMemory.cs`
- `Core/Core/ComparisonMemories.cs`
- `Core/Core/ComparisonMemoryProcess.cs`
- `Core/Core/Migrations/20260107192257_AddComparisonMemoryGlobalVariableSupport.cs`
- `EMS/API/Models/Dto/AddComparisonMemoryRequestDto.cs`
- `EMS/API/Models/Dto/EditComparisonMemoryRequestDto.cs`
- `EMS/API/Models/Dto/GetComparisonMemoriesResponseDto.cs`
- `EMS/API/Controllers/MonitoringController.cs`

### Frontend
- `ui/src/types/api.ts`
- `ui/src/components/AddEditComparisonMemoryDialog.tsx`
- `ui/src/components/ComparisonMemoryManagementPage.tsx`
- `ui/public/locales/en/translation.json`
- `ui/public/locales/fa/translation.json`
