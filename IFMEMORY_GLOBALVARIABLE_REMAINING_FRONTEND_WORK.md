# IfMemory Global Variable Integration - Remaining Frontend Work

## Summary
Backend implementation is COMPLETE. Database migration applied. Frontend types updated. The following frontend component updates are still needed:

## Completed ✅
1. ✅ Backend Model (`Core/Core/Models/IfMemory.cs`) - Added `OutputDestinationType` and `OutputReference`
2. ✅ Database Migration (`db0074_IfMemoryGlobalVarOutput`) - Applied successfully
3. ✅ CRUD Operations (`Core/Core/IfMemories.cs`) - Validation for Global Variables added
4. ✅ Process Logic (`Core/Core/IfMemoryProcess.cs`) - Global Variable write support added
5. ✅ Backend API DTOs - All DTOs updated with new fields
6. ✅ Frontend TypeScript Types (`ui/src/types/api.ts`) - All interfaces updated
7. ✅ IfMemoryManagementPage.tsx - `fetchIfMemories` updated to resolve Global Variable names

## Remaining Work 🔧

### 1. AddEditIfMemoryDialog.tsx - Complete Integration
**File**: `ui/src/components/AddEditIfMemoryDialog.tsx`

**Required Changes** (follow TimeoutMemoryDialog pattern at `/ui/src/components/AddEditTimeoutMemoryDialog.tsx`):

#### A. State Management
```typescript
// Add state for global variables
const [globalVariables, setGlobalVariables] = useState<GlobalVariable[]>([]);
const [loadingGlobalVariables, setLoadingGlobalVariables] = useState(false);
```

#### B. Form Initialization (around line 220-260)
```typescript
const initialFormData: FormData = {
  name: '',
  branches: [],
  defaultValue: 0,
  variableMappings: [],
  outputDestinationType: TimeoutSourceType.Point,  // ADD THIS
  outputReference: '',                              // ADD THIS
  outputItemId: null,                               // NULLABLE NOW
  outputType: IfMemoryOutputType.Digital,
  interval: 1,
  isDisabled: false,
  description: '',
};
```

#### C. Load Form Data (when editing, around line 235-255)
```typescript
// Update to use new fields
outputDestinationType: ifMemory.outputDestinationType,
outputReference: ifMemory.outputReference,
outputItemId: ifMemory.outputItemId,
```

#### D. Fetch Global Variables (add useEffect)
```typescript
useEffect(() => {
  const fetchGlobalVariables = async () => {
    try {
      setLoadingGlobalVariables(true);
      const response = await getGlobalVariables({});
      if (response?.globalVariables) {
        setGlobalVariables(response.globalVariables);
      }
    } catch (err) {
      logger.error('Failed to fetch global variables', err);
    } finally {
      setLoadingGlobalVariables(false);
    }
  };

  if (open) {
    fetchGlobalVariables();
  }
}, [open]);
```

#### E. Output Selection Logic
Add similar to TimeoutMemory (lines 515-620 in AddEditTimeoutMemoryDialog.tsx):

1. **Toggle Button** for Output Destination Type selection
```tsx
<Typography variant="subtitle2" gutterBottom>
  {t('ifMemory.outputDestinationType')} *
</Typography>
<ToggleButtonGroup
  value={formData.outputDestinationType}
  exclusive
  onChange={handleOutputDestinationTypeChange}
  size="small"
  fullWidth
>
  <ToggleButton value={TimeoutSourceType.Point} data-id-ref="if-memory-output-type-point-btn">
    {t('ifMemory.point')}
  </ToggleButton>
  <ToggleButton value={TimeoutSourceType.GlobalVariable} data-id-ref="if-memory-output-type-gv-btn">
    {t('ifMemory.globalVariable')}
  </ToggleButton>
</ToggleButtonGroup>
```

2. **Conditional Rendering** for Point vs Global Variable selection
```tsx
{formData.outputDestinationType === TimeoutSourceType.Point && (
  <Autocomplete
    options={outputItems}
    // ... existing output item selection logic
  />
)}

{formData.outputDestinationType === TimeoutSourceType.GlobalVariable && (
  <Autocomplete
    options={globalVariables}
    getOptionLabel={(option) => option.name}
    value={selectedOutputVariable}
    onChange={handleOutputVariableChange}
    // ...
  />
)}
```

#### F. Handler Functions
```typescript
const handleOutputDestinationTypeChange = (_event: React.MouseEvent<HTMLElement>, newValue: number | null) => {
  if (newValue !== null) {
    setFormData((prev) => ({ ...prev, outputDestinationType: newValue, outputReference: '' }));
    setSelectedOutputItem(null);
    setSelectedOutputVariable(null);
  }
};

const handleOutputVariableChange = (_event: unknown, newValue: GlobalVariable | null) => {
  setSelectedOutputVariable(newValue);
  setFormData((prev) => ({
    ...prev,
    outputReference: newValue?.name || '',
  }));
};
```

#### G. Computed Values (useMemo)
```typescript
// Selected output item (for Point destination)
const selectedOutputItem = useMemo(() => {
  if (formData.outputDestinationType === TimeoutSourceType.Point) {
    return outputItems.find((item) => item.id === formData.outputReference) || null;
  }
  return null;
}, [outputItems, formData.outputDestinationType, formData.outputReference]);

// Selected output variable (for GlobalVariable destination)
const selectedOutputVariable = useMemo(() => {
  if (formData.outputDestinationType === TimeoutSourceType.GlobalVariable) {
    return globalVariables.find((v) => v.name === formData.outputReference) || null;
  }
  return null;
}, [globalVariables, formData.outputDestinationType, formData.outputReference]);
```

#### H. Form Submission (around line 630-660)
```typescript
// Update API calls to include new fields
const payload: AddIfMemoryRequestDto = {
  name: formData.name || null,
  branches: JSON.stringify(branches),
  defaultValue: formData.defaultValue,
  variableAliases: JSON.stringify(aliasMap),
  outputDestinationType: formData.outputDestinationType,  // ADD THIS
  outputReference: formData.outputReference,              // ADD THIS
  outputItemId: formData.outputItemId,                    // NULLABLE NOW
  outputType: formData.outputType,
  interval: formData.interval,
  isDisabled: formData.isDisabled,
  description: formData.description || null,
};
```

### 2. Translation Keys
**Files**: 
- `ui/public/locales/en/translation.json`
- `ui/public/locales/fa/translation.json`

#### Add Keys:
```json
{
  "ifMemory": {
    "outputDestinationType": "Output Destination Type" / "نوع مقصد خروجی",
    "point": "Point" / "نقطه",
    "globalVariable": "Global Variable" / "متغیر سراسری",
    "outputVariable": "Output Variable" / "متغیر خروجی",
    "selectOutputVariable": "Select output global variable" / "متغیر سراسری خروجی را انتخاب کنید",
    "outputVariableRequired": "Output variable is required" / "متغیر خروجی الزامی است",
    "help": {
      "outputVariable": "Select a global variable to receive the IF memory result. For Digital output, Boolean or Float types are supported. For Analog output, only Float type is supported." /
                        "یک متغیر سراسری برای دریافت نتیجه حافظه IF انتخاب کنید. برای خروجی دیجیتال، از انواع Boolean یا Float پشتیبانی می‌شود. برای خروجی آنالوگ، فقط از نوع Float پشتیبانی می‌شود."
    }
  }
}
```

### 3. Testing Checklist
After completing the above changes, test the following scenarios:

#### Create New IfMemory
- [ ] Create with Point output (Digital and Analog)
- [ ] Create with GlobalVariable output (Digital and Analog)
- [ ] Verify validation: Digital GV can be Boolean or Float
- [ ] Verify validation: Analog GV must be Float only
- [ ] Verify disabled GlobalVariables are not selectable

#### Edit Existing IfMemory
- [ ] Edit IfMemory with Point output
- [ ] Edit IfMemory with GlobalVariable output
- [ ] Change from Point to GlobalVariable
- [ ] Change from GlobalVariable to Point

#### Display and Monitoring
- [ ] Verify IfMemoryManagementPage shows GlobalVariable names correctly
- [ ] Verify Persian/English translations work
- [ ] Verify the output value is written to GlobalVariable in real-time
- [ ] Check data grid displays output destination type correctly

## Reference Files (Already Implemented)
Use these as templates:
1. **TimeoutMemory Dialog**: `ui/src/components/AddEditTimeoutMemoryDialog.tsx` (lines 42-620)
2. **TimeoutMemory Page**: `ui/src/components/TimeoutMemoryManagementPage.tsx` (lines 140-200)
3. **Backend Validation**: `Core/Core/IfMemories.cs` (lines 119-233)

## Estimated Time: 2-3 hours
