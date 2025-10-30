# Prompt Enhancement Template

## Purpose
This prompt template is designed to analyze user requests, understand the project context, and generate comprehensive, actionable prompts for AI agents to implement changes in the EMS Monitoring API project.

**Important:** This prompt does NOT modify files directly. It analyzes requests and generates enhanced prompts for execution by other AI agents.

---

## Analysis Framework

### Phase 1: Request Understanding

#### 1.1 Extract Core Intent
- **Primary Goal**: What is the user trying to accomplish?
- **Feature Type**: New feature | Bug fix | Refactoring | Enhancement | Documentation
- **Scope**: Single endpoint | Multiple endpoints | Infrastructure | Architecture change
- **Complexity**: Simple | Moderate | Complex | Architectural

#### 1.2 Identify Key Requirements
- [ ] What functionality needs to be added/changed?
- [ ] What are the input parameters and data structures?
- [ ] What are the expected outputs and response formats?
- [ ] Are there authentication/authorization requirements?
- [ ] Are there real-time update requirements (SignalR)?
- [ ] Are there background processing needs?
- [ ] Are there database schema changes required?

#### 1.3 Detect Implicit Requirements
- Validation rules not explicitly stated
- Error handling scenarios
- Security considerations
- Performance implications
- Backward compatibility needs
- API versioning considerations

---

### Phase 2: Project Context Analysis

#### 2.1 Affected Components Checklist
- [ ] **Controllers**: Which controller(s) will be modified/created?
- [ ] **DTOs**: What request/response models are needed?
- [ ] **Services**: What business logic services are involved?
- [ ] **Repositories**: What data access patterns are needed? (via Core library)
- [ ] **SignalR Hubs**: Are real-time updates required?
- [ ] **Background Workers**: Are scheduled tasks needed?
- [ ] **Database**: Are migrations required?
- [ ] **Authentication**: Are JWT claims or roles involved?
- [ ] **Logging**: What audit trail is needed?

#### 2.2 Integration Points
- [ ] How does this integrate with existing endpoints?
- [ ] What dependencies exist with Core library?
- [ ] Are there message queue interactions (MassTransit)?
- [ ] Does this affect existing SignalR broadcasts?
- [ ] Are there cascading updates to other features?

#### 2.3 Naming Convention Analysis
- Determine appropriate DTO names (`*RequestDto`, `*ResponseDto`)
- Identify controller action names (RESTful conventions)
- Plan database entity names (if applicable)
- Consider SignalR method names (if applicable)

---

### Phase 3: Best Practices Application

#### 3.1 Security Checklist
- [ ] Input validation requirements (data annotations)
- [ ] Authorization requirements (`[Authorize]`, roles)
- [ ] Rate limiting needs
- [ ] Sensitive data handling
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)

#### 3.2 Performance Considerations
- [ ] Pagination needed for large datasets?
- [ ] Caching opportunities identified?
- [ ] Async/await patterns required?
- [ ] Query optimization needs (eager loading, compiled queries)?
- [ ] Connection pooling considerations?

#### 3.3 Error Handling Strategy
- [ ] Expected error scenarios mapped
- [ ] Appropriate HTTP status codes determined
- [ ] Structured error response format defined
- [ ] Logging strategy planned
- [ ] User-friendly error messages crafted

#### 3.4 Testing Strategy
- [ ] Unit test scenarios identified
- [ ] Integration test requirements
- [ ] Edge cases documented
- [ ] API.http examples planned
- [ ] Manual testing steps outlined

---

### Phase 4: Documentation Requirements

#### 4.1 Code Documentation
- [ ] XML documentation for new endpoints
- [ ] Parameter descriptions with examples
- [ ] Response type documentation
- [ ] Error response documentation
- [ ] Remarks with sample requests

#### 4.2 API Documentation
- [ ] API.http examples for all new endpoints
- [ ] Success scenario examples
- [ ] Error scenario examples
- [ ] Authentication header examples

#### 4.3 SignalR Documentation (if applicable)
- [ ] Hub method documentation
- [ ] Client method signatures
- [ ] Update `/api/Monitoring/SignalRHubInfo` endpoint

---

## Enhanced Prompt Generation Template

### Section 1: Implementation Overview
```
## Task: [Clear, concise task title]

**Objective**: [1-2 sentence description of what needs to be accomplished]

**Affected Components**:
- Controllers: [List specific controllers]
- DTOs: [List request/response models needed]
- Services: [List services involved]
- Database: [Migration needed? Y/N]
- SignalR: [Real-time updates needed? Y/N]
- Background Workers: [Scheduled tasks needed? Y/N]
```

### Section 2: Detailed Requirements
```
## Requirements

### Functional Requirements
1. [Requirement 1 with specific details]
2. [Requirement 2 with specific details]
3. [...]

### Data Requirements
**Input Model** (`[Name]RequestDto`):
- Field: Type - Validation rules - Description
- [...]

**Output Model** (`[Name]ResponseDto`):
- Field: Type - Description
- [...]

### Business Rules
1. [Business rule 1]
2. [Business rule 2]
3. [...]

### Validation Rules
1. [Validation rule 1 with specific constraints]
2. [Validation rule 2 with specific constraints]
3. [...]
```

### Section 3: Technical Specifications
```
## Technical Implementation

### API Endpoint(s)
**Endpoint**: [HTTP Method] /api/[controller]/[action]
**Authorization**: [None | JWT | Role-based: Admin, User, etc.]
**Rate Limiting**: [Yes/No - Policy name if applicable]

**Success Response**: 
- Status Code: 200/201/204
- Body: { success: true, data: {...}, message: "..." }

**Error Responses**:
- 400: Bad Request - [Scenario]
- 401: Unauthorized - [Scenario]
- 403: Forbidden - [Scenario]
- 404: Not Found - [Scenario]
- 409: Conflict - [Scenario]
- 500: Internal Server Error - [Scenario]

### Database Operations
**Query Pattern**: [Select | Insert | Update | Delete | Complex Query]
**Performance Notes**: [Indexing needs, query optimization, etc.]
**Transaction Requirements**: [Yes/No - Scope if applicable]

### SignalR Integration (if applicable)
**Hub Method**: [Method name and signature]
**Client Callback**: [Client method name and parameters]
**Broadcast Scope**: [All clients | Specific user | Specific group]
**Trigger**: [When should the broadcast occur?]

### Background Worker (if applicable)
**Worker Name**: [Descriptive name]
**Schedule**: [Interval/Cron expression]
**Purpose**: [What task does it perform?]
**Dependencies**: [Services, database access, etc.]
```

### Section 4: Implementation Steps
```
## Implementation Steps

### Step 1: Create DTOs
1. Create `[Name]RequestDto` in `Models/Dto/`
   - Add validation attributes: [List specific attributes]
   - Initialize properties with appropriate defaults
   - Add XML documentation with examples

2. Create `[Name]ResponseDto` in `Models/Dto/`
   - Define response structure
   - Add XML documentation

### Step 2: [Controller/Service/Worker Implementation]
[Detailed step-by-step instructions with specific code patterns]

### Step 3: Error Handling
1. Wrap implementation in try-catch blocks
2. Handle specific exceptions: [List exception types]
3. Log at appropriate levels
4. Return structured error responses

### Step 4: Testing
1. Create API.http examples
2. Test success scenarios: [List scenarios]
3. Test error scenarios: [List scenarios]
4. Test authorization: [With/without token, different roles]
5. Verify SignalR broadcasts (if applicable)
6. Check database changes (if applicable)

### Step 5: Documentation
1. Add XML documentation to all public members
2. Add API.http examples
3. Update SignalRHubInfo endpoint (if SignalR methods changed)
4. Update README.md (if significant changes)
```

### Section 5: Quality Assurance
```
## Quality Checklist

### Code Quality
- [ ] Try-catch blocks on all operations
- [ ] Structured logging with context
- [ ] ModelState.IsValid checked
- [ ] Async/await used correctly (no .Result or .Wait())
- [ ] Null reference handling
- [ ] Proper naming conventions followed

### Security
- [ ] Input validation with data annotations
- [ ] Authorization attributes applied
- [ ] No sensitive data in logs or responses
- [ ] Parameterized database queries
- [ ] Rate limiting applied (if needed)

### Performance
- [ ] Async operations throughout
- [ ] Pagination for large datasets
- [ ] Caching implemented (if beneficial)
- [ ] Database queries optimized
- [ ] No N+1 query problems

### Documentation
- [ ] XML comments on all public members
- [ ] API.http examples created
- [ ] Swagger response types defined
- [ ] Error scenarios documented
- [ ] SignalR documentation updated (if applicable)

### Testing
- [ ] Success scenarios tested
- [ ] Error scenarios tested
- [ ] Authorization tested
- [ ] Edge cases tested
- [ ] Integration verified
```

### Section 6: Additional Considerations
```
## Additional Considerations

### Potential Issues & Mitigations
1. [Potential issue 1] → [Mitigation strategy]
2. [Potential issue 2] → [Mitigation strategy]

### Performance Optimizations
1. [Optimization suggestion 1]
2. [Optimization suggestion 2]

### Future Enhancements
1. [Possible future enhancement 1]
2. [Possible future enhancement 2]

### Dependencies
- Core library methods required: [List methods from Core library]
- External services: [List any external dependencies]
- Configuration changes: [Any appsettings.json changes needed]
```

---

## Usage Instructions

### How to Use This Template

1. **Receive User Request**: Carefully read and understand the user's request
2. **Apply Analysis Framework**: Work through Phases 1-4 systematically
3. **Identify Gaps**: Note any missing information or ambiguities
4. **Generate Enhanced Prompt**: Use the template above to create a comprehensive prompt
5. **Review & Suggest**: Before finalizing, analyze for:
   - Missing requirements
   - Security implications
   - Performance concerns
   - Best practice violations
   - Integration issues
6. **Present Suggestions**: Offer recommendations to the user before finalizing

### Analysis Output Format

Present your analysis and enhanced prompt as follows:

```markdown
# Request Analysis

## User Request Summary
[Concise summary of what the user wants]

## Identified Requirements
[Bulleted list of explicit and implicit requirements]

## Affected Components
[List of all components that will be touched]

## Complexity Assessment
[Simple/Moderate/Complex with justification]

---

# Suggested Improvements & Considerations

## Security Recommendations
[List security considerations not mentioned in original request]

## Performance Recommendations
[List performance optimizations to consider]

## Best Practice Recommendations
[List best practice suggestions]

## Questions & Clarifications
[Any ambiguities that should be clarified before implementation]

---

# Enhanced Implementation Prompt

[Use the Enhanced Prompt Generation Template above]
[Fill in all sections with specific, actionable details]
[Ensure all fields are complete and no placeholders remain]
```

---

## Example Usage

### Example User Request:
> "I need an endpoint to export alarm history to CSV format"

### Analysis Output:

#### Request Summary
User needs a new API endpoint that allows exporting historical alarm data in CSV format for offline analysis or reporting purposes.

#### Identified Requirements
**Explicit**:
- New endpoint for exporting data
- CSV format output
- Alarm history data

**Implicit**:
- Filtering by date range (start/end dates)
- Filtering by item/group/controller
- Large dataset handling (streaming/pagination)
- Authentication required
- Audit logging for data exports
- File download headers (Content-Disposition)

#### Affected Components
- MonitoringController (new endpoint)
- AlarmHistoryExportRequestDto (new)
- No new database tables needed
- Uses existing alarm history data via Core library
- No SignalR updates needed
- No background workers needed

#### Complexity Assessment
**Moderate** - Requires streaming large datasets, CSV generation, proper HTTP headers for file download, and multiple filter options.

---

#### Suggested Improvements

**Security Recommendations**:
1. Add rate limiting to prevent abuse (exports can be resource-intensive)
2. Implement export size limits to prevent memory exhaustion
3. Audit log all export operations with user ID and filters
4. Consider role-based access (e.g., only Admin can export)

**Performance Recommendations**:
1. Use `IAsyncEnumerable` for streaming large datasets
2. Implement streaming CSV generation (don't load all data into memory)
3. Add query optimization with proper indexes
4. Consider background job for very large exports with email notification

**Best Practice Recommendations**:
1. Use CsvHelper library for robust CSV generation
2. Include BOM for Excel compatibility
3. Properly escape CSV values to prevent CSV injection
4. Add Content-Length header for progress tracking
5. Include timestamp in filename for uniqueness

**Questions & Clarifications**:
1. Should there be a maximum date range limit (e.g., 1 year)?
2. Should exports be limited to a specific role (Admin only)?
3. Should we include additional metadata columns (user who acknowledged, notes)?
4. File naming convention preference?
5. Should we support different date formats or timezones?

---

### Enhanced Implementation Prompt
[Full detailed prompt following the template structure...]

---

## Best Practices for Prompt Enhancement

### Do's ✅
- Always analyze implicit requirements beyond explicit user requests
- Consider security implications for every feature
- Think about edge cases and error scenarios
- Plan for scalability and performance from the start
- Suggest improvements proactively
- Provide specific, actionable instructions
- Include concrete examples in generated prompts
- Reference existing patterns in the project
- Consider the full request lifecycle (input → processing → output)
- Think about monitoring and observability

### Don'ts ❌
- Don't assume user knowledge - be explicit about everything
- Don't leave placeholders in the final prompt
- Don't suggest breaking changes without noting them
- Don't ignore error handling requirements
- Don't forget about logging and auditing
- Don't overlook documentation requirements
- Don't skip validation considerations
- Don't ignore the existing project structure and patterns
- Don't repeat instructions from copilot-instructions.md
- Don't make implementation decisions without considering alternatives

---

## Key Principles

1. **Completeness**: Cover all aspects of implementation (code, tests, docs, security)
2. **Clarity**: Make instructions unambiguous and actionable
3. **Consistency**: Follow existing project patterns and conventions
4. **Quality**: Emphasize best practices and code quality
5. **Pragmatism**: Balance ideal solutions with practical constraints
6. **Context-Awareness**: Leverage existing project structure and capabilities
7. **Forward-Thinking**: Consider future maintenance and extensibility
8. **User-Centric**: Focus on solving the actual problem, not just the stated request

---

## Template Version
**Version**: 1.0  
**Last Updated**: October 30, 2025  
**Compatibility**: EMS Monitoring API v2.1 (ASP.NET Core 9.0)
