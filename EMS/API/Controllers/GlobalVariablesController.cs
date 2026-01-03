using System.Security.Claims;
using System.Text.Json;
using API.Hubs;
using API.Models.Dto;
using API.Services;
using Core;
using Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace API.Controllers;

/// <summary>
/// Global Variables controller for managing lightweight in-memory variables
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class GlobalVariablesController : ControllerBase
{
    private readonly ILogger<GlobalVariablesController> _logger;
    private readonly IAuditService _auditService;
    private readonly IHubContext<MonitoringHub> _hubContext;

    /// <summary>
    /// Initializes a new instance of the GlobalVariablesController
    /// </summary>
    public GlobalVariablesController(
        ILogger<GlobalVariablesController> logger,
        IAuditService auditService,
        IHubContext<MonitoringHub> hubContext)
    {
        _logger = logger;
        _auditService = auditService;
        _hubContext = hubContext;
    }

    /// <summary>
    /// Get all global variables with their current values
    /// </summary>
    /// <returns>List of all global variables with runtime values</returns>
    /// <remarks>
    /// Returns all global variables including their current values from Redis.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/globalvariables/GetGlobalVariables
    ///     {}
    ///     
    /// </remarks>
    /// <response code="200">Returns the complete list of global variables</response>
    /// <response code="401">If user is not authenticated</response>
    [HttpPost("GetGlobalVariables")]
    [ProducesResponseType(typeof(GetGlobalVariablesResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetGlobalVariables([FromBody] GetGlobalVariablesRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var variablesWithValues = await Points.GetAllGlobalVariablesWithValues();

            var response = new GetGlobalVariablesResponseDto();

            if (variablesWithValues != null)
            {
                foreach (var (config, currentValue, lastUpdateTime) in variablesWithValues)
                {
                    response.GlobalVariables!.Add(new GetGlobalVariablesResponseDto.GlobalVariable
                    {
                        Id = config.Id,
                        Name = config.Name,
                        VariableType = (int)config.VariableType,
                        Description = config.Description,
                        IsDisabled = config.IsDisabled,
                        CurrentValue = currentValue,
                        LastUpdateTime = lastUpdateTime,
                        CreatedAt = config.CreatedAt,
                        UpdatedAt = config.UpdatedAt
                    });
                }
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Failed to get global variables");
            return StatusCode(500, new GetGlobalVariablesResponseDto
            {
                IsSuccessful = false,
                ErrorMessage = e.Message
            });
        }
    }

    /// <summary>
    /// Add a new global variable
    /// </summary>
    /// <param name="request">Global variable configuration</param>
    /// <returns>ID of created variable</returns>
    /// <remarks>
    /// Creates a new global variable. Requires Admin role.
    /// Variable name must be unique and contain only alphanumeric characters, underscores, and hyphens.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/globalvariables/AddGlobalVariable
    ///     {
    ///        "name": "temp_setpoint",
    ///        "variableType": 1,
    ///        "description": "Temperature setpoint for HVAC control"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns ID of created global variable</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="403">If user is not an admin</response>
    /// <response code="400">If validation fails</response>
    [HttpPost("AddGlobalVariable")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(AddGlobalVariableResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> AddGlobalVariable([FromBody] AddGlobalVariableRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var globalVariable = new GlobalVariable
            {
                Name = request.Name,
                VariableType = (GlobalVariableType)request.VariableType,
                Description = request.Description,
                IsDisabled = request.IsDisabled
            };

            var (success, id, errorMessage) = await GlobalVariables.AddGlobalVariable(globalVariable);

            var response = new AddGlobalVariableResponseDto
            {
                IsSuccessful = success,
                ErrorMessage = errorMessage,
                Id = id
            };

            if (success && id.HasValue)
            {
                // Log audit
                await _auditService.LogAsync(
                    userId: userId,
                    action: "AddGlobalVariable",
                    entity: "GlobalVariable",
                    entityId: id.Value.ToString(),
                    details: $"Added global variable '{request.Name}' (Type: {request.VariableType})"
                );

                // Trigger settings update broadcast
                await _hubContext.Clients.All.SendAsync("ReceiveSettingsUpdate");
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Failed to add global variable");
            return StatusCode(500, new AddGlobalVariableResponseDto
            {
                IsSuccessful = false,
                ErrorMessage = e.Message
            });
        }
    }

    /// <summary>
    /// Edit an existing global variable
    /// </summary>
    /// <param name="request">Updated global variable configuration</param>
    /// <returns>Success status</returns>
    /// <remarks>
    /// Updates an existing global variable configuration. Requires Admin role.
    /// Note: This only updates configuration (name, type, description), not the runtime value.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/globalvariables/EditGlobalVariable
    ///     {
    ///        "id": "550e8400-e29b-41d4-a716-446655440000",
    ///        "name": "temp_setpoint_updated",
    ///        "variableType": 1,
    ///        "description": "Updated temperature setpoint"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns success status</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="403">If user is not an admin</response>
    /// <response code="400">If validation fails</response>
    [HttpPost("EditGlobalVariable")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(EditGlobalVariableResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> EditGlobalVariable([FromBody] EditGlobalVariableRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var globalVariable = new GlobalVariable
            {
                Id = request.Id,
                Name = request.Name,
                VariableType = (GlobalVariableType)request.VariableType,
                Description = request.Description,
                IsDisabled = request.IsDisabled
            };

            var (success, errorMessage) = await GlobalVariables.EditGlobalVariable(globalVariable);

            var response = new EditGlobalVariableResponseDto
            {
                IsSuccessful = success,
                ErrorMessage = errorMessage
            };

            if (success)
            {
                // Log audit
                await _auditService.LogAsync(
                    userId: userId,
                    action: "EditGlobalVariable",
                    entity: "GlobalVariable",
                    entityId: request.Id.ToString(),
                    details: $"Edited global variable '{request.Name}'"
                );

                // Trigger settings update broadcast
                await _hubContext.Clients.All.SendAsync("ReceiveSettingsUpdate");
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Failed to edit global variable");
            return StatusCode(500, new EditGlobalVariableResponseDto
            {
                IsSuccessful = false,
                ErrorMessage = e.Message
            });
        }
    }

    /// <summary>
    /// Delete a global variable
    /// </summary>
    /// <param name="request">Variable ID to delete</param>
    /// <returns>Success status</returns>
    /// <remarks>
    /// Deletes a global variable. Requires Admin role.
    /// Warning: This will remove the variable from all memories that reference it.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/globalvariables/DeleteGlobalVariable
    ///     {
    ///        "id": "550e8400-e29b-41d4-a716-446655440000"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns success status</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="403">If user is not an admin</response>
    [HttpPost("DeleteGlobalVariable")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(DeleteGlobalVariableResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DeleteGlobalVariable([FromBody] DeleteGlobalVariableRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // Get variable name before deletion for audit log
            var variable = await GlobalVariables.GetGlobalVariable(v => v.Id == request.Id);
            var variableName = variable?.Name ?? request.Id.ToString();

            var (success, errorMessage) = await GlobalVariables.DeleteGlobalVariable(request.Id);

            var response = new DeleteGlobalVariableResponseDto
            {
                IsSuccessful = success,
                ErrorMessage = errorMessage
            };

            if (success)
            {
                // Log audit
                await _auditService.LogAsync(
                    userId: userId,
                    action: "DeleteGlobalVariable",
                    entity: "GlobalVariable",
                    entityId: request.Id.ToString(),
                    details: $"Deleted global variable '{variableName}'"
                );

                // Trigger settings update broadcast
                await _hubContext.Clients.All.SendAsync("ReceiveSettingsUpdate");
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Failed to delete global variable");
            return StatusCode(500, new DeleteGlobalVariableResponseDto
            {
                IsSuccessful = false,
                ErrorMessage = e.Message
            });
        }
    }

    /// <summary>
    /// Get global variable usage information
    /// </summary>
    /// <param name="request">Variable ID to find usage for</param>
    /// <returns>List of memories using this variable</returns>
    /// <remarks>
    /// Returns information about which memories reference this global variable.
    /// Currently returns empty list as phase 1 implementation doesn't include variable resolution in memories.
    /// This will be populated in phase 2 when memories are updated to support global variables.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/globalvariables/GetGlobalVariableUsage
    ///     {
    ///        "id": "550e8400-e29b-41d4-a716-446655440000"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns usage information</response>
    /// <response code="401">If user is not authenticated</response>
    [HttpPost("GetGlobalVariableUsage")]
    [ProducesResponseType(typeof(GetGlobalVariableUsageResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetGlobalVariableUsage([FromBody] GetGlobalVariableUsageRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var variable = await GlobalVariables.GetGlobalVariable(v => v.Id == request.Id);

            if (variable == null)
            {
                return Ok(new GetGlobalVariableUsageResponseDto
                {
                    IsSuccessful = false,
                    ErrorMessage = "Global variable not found"
                });
            }

            var response = new GetGlobalVariableUsageResponseDto
            {
                VariableName = variable.Name,
                Usages = new List<GetGlobalVariableUsageResponseDto.MemoryUsage>()
            };

            // TODO: In phase 2, scan all memory types for references to this variable
            // For now, return empty list as memories don't yet support global variables
            
            // Example of what phase 2 will include:
            // - FormulaMemory: Check VariableAliases JSON for variable name
            // - IfMemory: Check ConditionGroups JSON for variable name
            // - AverageMemory: Check if InputItemIds references this variable ID
            // etc.

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Failed to get global variable usage");
            return StatusCode(500, new GetGlobalVariableUsageResponseDto
            {
                IsSuccessful = false,
                ErrorMessage = e.Message
            });
        }
    }
}
