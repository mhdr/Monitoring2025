using System.Security.Claims;
using API.Hubs;
using API.Models.Dto;
using API.Models.ModelDto;
using API.Services;
using Contracts;
using Core;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using DB.User.Data;
using DB.User.Models;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Share.Libs;
using ItemType = Core.Libs.ItemType;


namespace API.Controllers;

/// <summary>
/// Monitoring controller for managing monitoring data, groups, items, alarms, and system configurations
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class MonitoringController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<MonitoringController> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IBus _bus;
    private readonly IAuditService _auditService;
    private readonly IHubContext<MonitoringHub> _hubContext;
    private readonly ConnectionTrackingService _connectionTracker;

    /// <summary>
    /// Initializes a new instance of the MonitoringController
    /// </summary>
    /// <param name="userManager">The user manager service</param>
    /// <param name="context">The application database context</param>
    /// <param name="logger">The logger service</param>
    /// <param name="httpContextAccessor">The HTTP context accessor</param>
    /// <param name="bus">The MassTransit bus service</param>
    /// <param name="auditService">The audit service for logging operations</param>
    /// <param name="hubContext">The SignalR hub context for broadcasting updates</param>
    /// <param name="connectionTracker">The connection tracking service for monitoring connected clients</param>
    public MonitoringController(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context,
        ILogger<MonitoringController> logger,
        IHttpContextAccessor httpContextAccessor,
        IBus bus,
        IAuditService auditService,
        IHubContext<MonitoringHub> hubContext,
        ConnectionTrackingService connectionTracker)
    {
        _userManager = userManager;
        _context = context;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
        _bus = bus;
        _auditService = auditService;
        _hubContext = hubContext;
        _connectionTracker = connectionTracker;
    }

    /// <summary>
    /// Get all groups in the system
    /// </summary>
    /// <returns>List of all groups in the system</returns>
    /// <remarks>
    /// Returns all groups without permission filtering. Client-side filtering should be applied
    /// based on the items/points the user has access to.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/groups
    ///     {}
    ///     
    /// </remarks>
    /// <response code="200">Returns the complete list of groups</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("Groups")]
    [ProducesResponseType(typeof(GroupsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Groups()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Unauthorized access attempt to Groups endpoint (no user id)");
                return Unauthorized();
            }

            _logger.LogInformation("Fetching all groups for user {UserId}", userId);

            var groups = await _context.Groups
                .OrderBy(x => x.Name)
                .ToListAsync();

            var groupList = new List<GroupsResponseDto.Group>();

            foreach (var g in groups)
            {
                var parentId = "";
                if (g.ParentId != null && g.ParentId != Guid.Empty)
                {
                    parentId = g.ParentId.ToString();
                }

                groupList.Add(new GroupsResponseDto.Group()
                {
                    Id = g.Id.ToString(),
                    Name = g.Name,
                    NameFa = g.NameFa,
                    ParentId = parentId,
                });
            }

            var response = new GroupsResponseDto()
            {
                Groups = groupList,
            };

            _logger.LogInformation("Successfully retrieved {GroupCount} groups for user {UserId}", 
                groupList.Count, userId);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving groups for user {UserId}", 
                User.FindFirstValue(ClaimTypes.NameIdentifier));
            return StatusCode(500, new { success = false, errorMessage = "Internal server error" });
        }
    }

    /// <summary>
    /// Get monitoring items accessible to the current user
    /// </summary>
    /// <param name="request">Items request parameters including ShowOrphans flag to control orphaned items visibility</param>
    /// <returns>List of monitoring items the user has access to based on their group permissions</returns>
    /// <remarks>
    /// User identity is extracted from JWT token. The ShowOrphans parameter determines whether
    /// items not assigned to any group should be included in the response.
    /// </remarks>
    /// <response code="200">Returns the list of accessible monitoring items</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("Items")]
    [ProducesResponseType(typeof(ItemsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Items([FromBody] ItemsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);

            var userGuid = Guid.Parse(userId);

            var items = (await Core.Points.ListPoints(x => x.IsDisabled == false)).OrderBy(x => x.ItemName);
            var groupItems = await _context.GroupItems.ToListAsync();

            var permittedItems = new List<ItemsResponseDto.Item>();

            foreach (var item in items)
            {
                if (user.UserName.ToLower() == "admin")
                {
                    var groupItem = groupItems.FirstOrDefault(x => x.ItemId == item.Id);

                    if (request.ShowOrphans)
                    {
                        string groupId = "";

                        if (groupItem != null)
                        {
                            groupId = groupItem.GroupId.ToString();
                        }

                        permittedItems.Add(new ItemsResponseDto.Item()
                        {
                            Id = item.Id.ToString(),
                            Name = item.ItemName,
                            NameFa = item.ItemNameFa,
                            ItemType = (Share.Libs.ItemType)item.ItemType,
                            GroupId = groupId,
                            OnText = item.OnText,
                            OnTextFa = item.OnTextFa,
                            OffText = item.OffText,
                            OffTextFa = item.OffTextFa,
                            Unit = item.Unit,
                            UnitFa = item.UnitFa,
                            CalculationMethod = (Share.Libs.ValueCalculationMethod)item.CalculationMethod,
                            NumberOfSamples = item.NumberOfSamples,
                            IsDisabled = item.IsDisabled ?? false,
                            NormMax = item.NormMax,
                            NormMin = item.NormMin,
                            PointNumber = item.PointNumber,
                            ShouldScale = (Share.Libs.ShouldScaleType)item.ShouldScale,
                            SaveInterval = item.SaveInterval,
                            SaveHistoricalInterval = item.SaveHistoricalInterval,
                            ScaleMax = item.ScaleMax,
                            ScaleMin = item.ScaleMin,
                            IsEditable = item.IsEditable,
                            InterfaceType = (Share.Libs.InterfaceType)item.InterfaceType,
                        });
                    }
                    else
                    {
                        if (groupItem != null)
                        {
                            permittedItems.Add(new ItemsResponseDto.Item()
                            {
                                Id = item.Id.ToString(),
                                Name = item.ItemName,
                                NameFa = item.ItemNameFa,
                                ItemType = (Share.Libs.ItemType)item.ItemType,
                                GroupId = groupItem.GroupId.ToString(),
                                OnText = item.OnText,
                                OnTextFa = item.OnTextFa,
                                OffText = item.OffText,
                                OffTextFa = item.OffTextFa,
                                Unit = item.Unit,
                                UnitFa = item.UnitFa,
                                CalculationMethod = (Share.Libs.ValueCalculationMethod)item.CalculationMethod,
                                NumberOfSamples = item.NumberOfSamples,
                                IsDisabled = item.IsDisabled ?? false,
                                NormMax = item.NormMax,
                                NormMin = item.NormMin,
                                PointNumber = item.PointNumber,
                                ShouldScale = (Share.Libs.ShouldScaleType)item.ShouldScale,
                                SaveInterval = item.SaveInterval,
                                SaveHistoricalInterval = item.SaveHistoricalInterval,
                                ScaleMax = item.ScaleMax,
                                ScaleMin = item.ScaleMin,
                                IsEditable = item.IsEditable,
                                InterfaceType = (Share.Libs.InterfaceType)item.InterfaceType,
                            });
                        }
                    }
                }
                else
                {
                    var permissions = await _context.ItemPermissions.Where(x => x.UserId == userGuid)
                        .ToListAsync();
                    var permission = permissions.FirstOrDefault(x => x.ItemId == item.Id);

                    if (permission != null)
                    {
                        var groupItem = groupItems.FirstOrDefault(x => x.ItemId == item.Id);

                        if (request.ShowOrphans)
                        {
                            string groupId = "";

                            if (groupItem != null)
                            {
                                groupId = groupItem.GroupId.ToString();
                            }

                            permittedItems.Add(new ItemsResponseDto.Item()
                            {
                                Id = item.Id.ToString(),
                                Name = item.ItemName,
                                NameFa = item.ItemNameFa,
                                ItemType = (Share.Libs.ItemType)item.ItemType,
                                GroupId = groupId,
                                OnText = item.OnText,
                                OnTextFa = item.OnTextFa,
                                OffText = item.OffText,
                                OffTextFa = item.OffTextFa,
                                Unit = item.Unit,
                                UnitFa = item.UnitFa,
                                CalculationMethod = (Share.Libs.ValueCalculationMethod)item.CalculationMethod,
                                NumberOfSamples = item.NumberOfSamples,
                                IsDisabled = item.IsDisabled ?? false,
                                NormMax = item.NormMax,
                                NormMin = item.NormMin,
                                PointNumber = item.PointNumber,
                                ShouldScale = (Share.Libs.ShouldScaleType)item.ShouldScale,
                                SaveInterval = item.SaveInterval,
                                SaveHistoricalInterval = item.SaveHistoricalInterval,
                                ScaleMax = item.ScaleMax,
                                ScaleMin = item.ScaleMin,
                                IsEditable = item.IsEditable,
                                InterfaceType = (Share.Libs.InterfaceType)item.InterfaceType,
                            });
                        }
                        else
                        {
                            if (groupItem != null)
                            {
                                permittedItems.Add(new ItemsResponseDto.Item()
                                {
                                    Id = item.Id.ToString(),
                                    Name = item.ItemName,
                                    NameFa = item.ItemNameFa,
                                    ItemType = (Share.Libs.ItemType)item.ItemType,
                                    GroupId = groupItem.GroupId.ToString(),
                                    OnText = item.OnText,
                                    OnTextFa = item.OnTextFa,
                                    OffText = item.OffText,
                                    OffTextFa = item.OffTextFa,
                                    Unit = item.Unit,
                                    UnitFa = item.UnitFa,
                                    CalculationMethod = (Share.Libs.ValueCalculationMethod)item.CalculationMethod,
                                    NumberOfSamples = item.NumberOfSamples,
                                    IsDisabled = item.IsDisabled ?? false,
                                    NormMax = item.NormMax,
                                    NormMin = item.NormMin,
                                    PointNumber = item.PointNumber,
                                    ShouldScale = (Share.Libs.ShouldScaleType)item.ShouldScale,
                                    SaveInterval = item.SaveInterval,
                                    SaveHistoricalInterval = item.SaveHistoricalInterval,
                                    ScaleMax = item.ScaleMax,
                                    ScaleMin = item.ScaleMin,
                                    IsEditable = item.IsEditable,
                                    InterfaceType = (Share.Libs.InterfaceType)item.InterfaceType,
                                });
                            }
                        }
                    }
                }
            }

            var response = new ItemsResponseDto()
            {
                Items = permittedItems,
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving items for user");
            return StatusCode(500, new { success = false, errorMessage = "Internal server error" });
        }
    }

    /// <summary>
    /// Get a single monitoring item by ID with all its properties
    /// </summary>
    /// <param name="request">Get item request containing the item ID to retrieve</param>
    /// <returns>Complete monitoring item data including all configuration properties</returns>
    /// <remarks>
    /// Retrieves a single monitoring item with all its properties. The user must have access
    /// to the item either through admin privileges or explicit item permissions.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/getitem
    ///     {
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440000"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns the monitoring item with all its properties</response>
    /// <response code="400">Validation error - invalid item ID format or missing required fields</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - user does not have permission to access this item</response>
    /// <response code="404">Item not found - the specified item ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("GetItem")]
    [ProducesResponseType(typeof(GetItemResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetItem([FromBody] GetItemRequestDto request)
    {
        try
        {
            // Extract user ID from JWT token
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("GetItem: User ID not found in token");
                return Unauthorized(new { success = false, errorMessage = "User not authenticated" });
            }

            // Validate ModelState
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("GetItem: Validation failed for user {UserId}, Errors: {Errors}", 
                    userId, string.Join(", ", errors));

                return BadRequest(new GetItemResponseDto
                {
                    Success = false,
                    ErrorMessage = "Validation failed: " + string.Join(", ", errors)
                });
            }

            // Validate and parse item ID
            if (!Guid.TryParse(request.ItemId, out var itemGuid))
            {
                _logger.LogWarning("GetItem: Invalid item ID format {ItemId} for user {UserId}", 
                    request.ItemId, userId);

                return BadRequest(new GetItemResponseDto
                {
                    Success = false,
                    ErrorMessage = "Invalid item ID format"
                });
            }

            _logger.LogInformation("GetItem: Retrieving item {ItemId} for user {UserId}", 
                request.ItemId, userId);

            // Retrieve the item from Core
            var item = await Core.Points.GetPoint(itemGuid);

            if (item == null)
            {
                _logger.LogWarning("GetItem: Item {ItemId} not found", request.ItemId);

                return NotFound(new GetItemResponseDto
                {
                    Success = false,
                    ErrorMessage = "Item not found"
                });
            }

            // Get user information
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                _logger.LogWarning("GetItem: User {UserId} not found", userId);
                return Unauthorized(new { success = false, errorMessage = "User not found" });
            }

            var userGuid = Guid.Parse(userId);
            bool hasAccess = false;
            bool isEditable = false;

            // Check access permissions
            if (user.UserName?.ToLower() == "admin")
            {
                hasAccess = true;
                _logger.LogDebug("GetItem: Admin user {UserId} has full access to item {ItemId}", 
                    userId, request.ItemId);
            }
            else
            {
                // Check item-level permissions
                var permission = await _context.ItemPermissions
                    .FirstOrDefaultAsync(x => x.UserId == userGuid && x.ItemId == itemGuid);

                if (permission != null)
                {
                    hasAccess = true;
                    _logger.LogDebug("GetItem: User {UserId} has permission for item {ItemId}", 
                        userId, request.ItemId);
                }
            }

            if (!hasAccess)
            {
                _logger.LogWarning("GetItem: User {UserId} does not have access to item {ItemId}", 
                    userId, request.ItemId);

                return StatusCode(403, new GetItemResponseDto
                {
                    Success = false,
                    ErrorMessage = "Access denied: You do not have permission to view this item"
                });
            }

            // Get group assignment
            var groupItem = await _context.GroupItems
                .FirstOrDefaultAsync(x => x.ItemId == itemGuid);

            // Build response
            var response = new GetItemResponseDto
            {
                Success = true,
                Data = new GetItemResponseDto.MonitoringItem
                {
                    Id = item.Id.ToString(),
                    Name = item.ItemName,
                    NameFa = item.ItemNameFa,
                    ItemType = (Share.Libs.ItemType)item.ItemType,
                    GroupId = groupItem?.GroupId.ToString(),
                    OnText = item.OnText,
                    OnTextFa = item.OnTextFa,
                    OffText = item.OffText,
                    OffTextFa = item.OffTextFa,
                    Unit = item.Unit,
                    UnitFa = item.UnitFa,
                    CalculationMethod = (Share.Libs.ValueCalculationMethod)item.CalculationMethod,
                    NumberOfSamples = item.NumberOfSamples,
                    SaveOnChange = (Share.Libs.SaveOnChange)item.SaveOnChange,
                    SaveOnChangeRange = item.SaveOnChangeRange,
                    IsDisabled = item.IsDisabled,
                    IsCalibrationEnabled = item.IsCalibrationEnabled,
                    CalibrationA = item.CalibrationA,
                    CalibrationB = item.CalibrationB,
                    NormMax = item.NormMax,
                    NormMin = item.NormMin,
                    PointNumber = item.PointNumber,
                    ShouldScale = (Share.Libs.ShouldScaleType)item.ShouldScale,
                    SaveInterval = item.SaveInterval,
                    SaveHistoricalInterval = item.SaveHistoricalInterval,
                    ScaleMax = item.ScaleMax,
                    ScaleMin = item.ScaleMin,
                    IsEditable = item.IsEditable,
                    InterfaceType = (Share.Libs.InterfaceType)item.InterfaceType,
                }
            };

            _logger.LogInformation("GetItem: Successfully retrieved item {ItemId} for user {UserId}", 
                request.ItemId, userId);

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "GetItem: Validation error");
            return BadRequest(new GetItemResponseDto
            {
                Success = false,
                ErrorMessage = ex.Message
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "GetItem: Unauthorized access attempt");
            return StatusCode(403, new GetItemResponseDto
            {
                Success = false,
                ErrorMessage = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetItem: Error retrieving item {ItemId}", request?.ItemId ?? "unknown");
            return StatusCode(500, new GetItemResponseDto
            {
                Success = false,
                ErrorMessage = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get current values for monitoring items
    /// </summary>
    /// <param name="request">Values request containing optional list of item IDs to filter</param>
    /// <returns>Current values for the specified or all monitoring items</returns>
    /// <response code="200">Returns the current values for monitoring items</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("Values")]
    [ProducesResponseType(typeof(ValuesResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Values([FromBody] ValuesRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // var userGuid = Guid.Parse(userId);

            List<FinalItemRedis> values = new();

            if (request.ItemIds == null || request.ItemIds.Count() == 0)
            {
                values = await Core.Points.GetValues();
            }
            else
            {
                values = await Core.Points.GetValues(request.ItemIds);
            }

            var response = new ValuesResponseDto();

            foreach (var value in values)
            {
                response.Values.Add(new ValuesResponseDto.MultiValue()
                {
                    ItemId = value.ItemId.ToString(),
                    Value = value.Value,
                    Time = value.Time,
                });
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Get current value for a single monitoring item
    /// </summary>
    /// <param name="request">Value request containing the item ID</param>
    /// <returns>Current value for the specified monitoring item</returns>
    /// <response code="200">Returns the current value for the monitoring item</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("Value")]
    [ProducesResponseType(typeof(ValueResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Value([FromBody] ValueRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // var userGuid = Guid.Parse(userId);

            var value = await Core.Points.GetValue(request.ItemId);

            var response = new ValueResponseDto();

            response.Value = new ValueResponseDto.SingleValue()
            {
                ItemId = value.ItemId.ToString(),
                Value = value.Value,
                Time = value.Time,
            };

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Get historical data for a monitoring item within a date range
    /// </summary>
    /// <param name="request">History request containing item ID, start date, and end date</param>
    /// <returns>Historical values for the specified item and time period</returns>
    /// <response code="200">Returns the historical data for the monitoring item</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("History")]
    [ProducesResponseType(typeof(HistoryResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> History([FromBody] HistoryRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // var userGuid = Guid.Parse(userId);

            var values = await Core.Points.GetHistory(request.ItemId, request.StartDate, request.EndDate);

            var response = new HistoryResponseDto();

            foreach (var v in values)
            {
                response.Values.Add(new HistoryResponseDto.Data()
                {
                    Value = v.Value,
                    Time = v.Time,
                });
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Calculate the total duration (in seconds) that a digital point held a specific value within a time range
    /// </summary>
    /// <param name="request">Request containing item ID, start date, end date, and target value ("0" or "1")</param>
    /// <returns>Total duration in seconds that the point held the specified value</returns>
    /// <remarks>
    /// This endpoint only works for digital points (DigitalInput and DigitalOutput).
    /// It calculates the cumulative time the point was in the specified state.
    /// 
    /// The calculation handles edge cases:
    /// - If no state changes occur in the range, it looks back up to 90 days for the last known state
    /// - States that persist across the time boundary are handled correctly
    /// - Returns both raw seconds and a human-readable formatted duration
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/calculatestateduration
    ///     {
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "startDate": 1697587200,
    ///        "endDate": 1697673600,
    ///        "value": "1"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns the calculated duration and metadata</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If the point is not digital or validation fails</response>
    /// <response code="404">If the point is not found</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("CalculateStateDuration")]
    [ProducesResponseType(typeof(CalculateStateDurationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> CalculateStateDuration([FromBody] CalculateStateDurationRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Unauthorized access attempt to CalculateStateDuration endpoint (no user id)");
                return Unauthorized();
            }

            // Validate model state
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("Validation failed for CalculateStateDuration request by {UserId}: {Errors}", userId, string.Join("; ", errors));

                return BadRequest(new CalculateStateDurationResponseDto
                {
                    Success = false,
                    Error = $"Validation failed: {string.Join("; ", errors)}"
                });
            }

            _logger.LogInformation("Calculating state duration for point {ItemId} from {StartDate} to {EndDate} for value {Value} by user {UserId}", 
                request.ItemId, request.StartDate, request.EndDate, request.Value, userId);

            // Get the monitoring item to check if it's digital
            var itemGuid = Guid.Parse(request.ItemId!);
            var monitoringItem = await Core.Points.GetPoint(itemGuid);

            if (monitoringItem == null)
            {
                _logger.LogWarning("Point {ItemId} not found for state duration calculation", request.ItemId);
                return NotFound(new CalculateStateDurationResponseDto
                {
                    Success = false,
                    Error = "Point not found"
                });
            }

            // Check if the point is digital (DigitalInput or DigitalOutput)
            if (monitoringItem.ItemType != ItemType.DigitalInput && 
                monitoringItem.ItemType != ItemType.DigitalOutput)
            {
                _logger.LogWarning("Attempted to calculate state duration for non-digital point {ItemId} of type {ItemType}", 
                    request.ItemId, monitoringItem.ItemType);
                
                return BadRequest(new CalculateStateDurationResponseDto
                {
                    Success = false,
                    Error = $"State duration calculation is only supported for digital points. This point is of type: {monitoringItem.ItemType}"
                });
            }

            // Calculate the state duration
            var (totalDurationSeconds, stateChangeCount, usedLastKnownState) = 
                await Core.Points.CalculateStateDuration(request.ItemId!, request.StartDate, request.EndDate, request.Value!);

            // Format the duration as human-readable string
            var formattedDuration = FormatDuration(totalDurationSeconds);

            _logger.LogInformation("State duration calculated successfully for point {ItemId}: {Duration} seconds ({Formatted})", 
                request.ItemId, totalDurationSeconds, formattedDuration);

            return Ok(new CalculateStateDurationResponseDto
            {
                Success = true,
                MatchedValue = request.Value!,
                TotalDurationSeconds = totalDurationSeconds,
                FormattedDuration = formattedDuration,
                StateChangeCount = stateChangeCount,
                UsedLastKnownState = usedLastKnownState
            });
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error calculating state duration for point {ItemId}", request?.ItemId);
            return StatusCode(StatusCodes.Status500InternalServerError, new CalculateStateDurationResponseDto
            {
                Success = false,
                Error = $"Internal server error: {e.Message}"
            });
        }
    }

    /// <summary>
    /// Formats a duration in seconds to a human-readable string
    /// </summary>
    /// <param name="totalSeconds">Total duration in seconds</param>
    /// <returns>Formatted string like "2d 5h 30m 15s" or "0s" if zero</returns>
    private static string FormatDuration(long totalSeconds)
    {
        if (totalSeconds == 0)
        {
            return "0s";
        }

        var days = totalSeconds / 86400;
        var hours = (totalSeconds % 86400) / 3600;
        var minutes = (totalSeconds % 3600) / 60;
        var seconds = totalSeconds % 60;

        var parts = new List<string>();
        
        if (days > 0) parts.Add($"{days}d");
        if (hours > 0) parts.Add($"{hours}h");
        if (minutes > 0) parts.Add($"{minutes}m");
        if (seconds > 0) parts.Add($"{seconds}s");

        return string.Join(" ", parts);
    }

    /// <summary>
    /// Calculate the mean (average) value for an analog point within a specified date range
    /// </summary>
    /// <param name="request">Request containing item ID, start date, and end date (Unix timestamps in seconds)</param>
    /// <returns>Mean value for the specified analog point and time period</returns>
    /// <remarks>
    /// This endpoint only works for analog points (AnalogInput and AnalogOutput).
    /// For digital points, it will return an error as mean calculation is meaningless for binary values.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/pointmean
    ///     {
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "startDate": 1697587200,
    ///        "endDate": 1697673600
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns the calculated mean value and data point count</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If the point is not analog or validation fails</response>
    /// <response code="404">If the point is not found</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("PointMean")]
    [ProducesResponseType(typeof(PointMeanResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> PointMean([FromBody] PointMeanRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Unauthorized access attempt to PointMean endpoint (no user id)");
                return Unauthorized();
            }

            // Validate model state
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("Validation failed for PointMean request by {UserId}: {Errors}", userId, string.Join("; ", errors));

                return BadRequest(new PointMeanResponseDto
                {
                    Success = false,
                    ErrorMessage = $"Validation failed: {string.Join("; ", errors)}"
                });
            }

            // Default to last 24 hours if dates not provided
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var startDate = request.StartDate ?? now - (24 * 60 * 60); // 24 hours ago
            var endDate = request.EndDate ?? now;

            _logger.LogInformation("Calculating mean for point {ItemId} from {StartDate} to {EndDate} by user {UserId}", 
                request.ItemId, startDate, endDate, userId);

            // Get the monitoring item to check if it's analog
            var itemGuid = Guid.Parse(request.ItemId!);
            var monitoringItem = await Core.Points.GetPoint(itemGuid);

            if (monitoringItem == null)
            {
                _logger.LogWarning("Point {ItemId} not found for mean calculation", request.ItemId);
                return NotFound(new PointMeanResponseDto
                {
                    Success = false,
                    ErrorMessage = "Point not found",
                    ItemId = request.ItemId
                });
            }

            // Check if the point is analog (AnalogInput or AnalogOutput)
            if (monitoringItem.ItemType != ItemType.AnalogInput && 
                monitoringItem.ItemType != ItemType.AnalogOutput)
            {
                _logger.LogWarning("Attempted to calculate mean for non-analog point {ItemId} of type {ItemType}", 
                    request.ItemId, monitoringItem.ItemType);
                
                return BadRequest(new PointMeanResponseDto
                {
                    Success = false,
                    ErrorMessage = $"Mean calculation is only supported for analog points. This point is of type: {monitoringItem.ItemType}",
                    ItemId = request.ItemId
                });
            }

            // Get historical data
            var values = await Core.Points.GetHistory(request.ItemId!, startDate, endDate);

            if (values == null || values.Count == 0)
            {
                _logger.LogInformation("No data found for point {ItemId} in the specified range", request.ItemId);
                return Ok(new PointMeanResponseDto
                {
                    Success = true,
                    Mean = null,
                    Count = 0,
                    ItemId = request.ItemId,
                    ErrorMessage = "No data available for the specified time range"
                });
            }

            // Parse values and calculate mean
            var numericValues = new List<double>();
            foreach (var v in values)
            {
                if (double.TryParse(v.Value, out double numericValue))
                {
                    numericValues.Add(numericValue);
                }
            }

            if (numericValues.Count == 0)
            {
                _logger.LogWarning("No valid numeric values found for point {ItemId}", request.ItemId);
                return Ok(new PointMeanResponseDto
                {
                    Success = true,
                    Mean = null,
                    Count = 0,
                    ItemId = request.ItemId,
                    ErrorMessage = "No valid numeric values found in the specified time range"
                });
            }

            var mean = numericValues.Average();

            _logger.LogInformation("Successfully calculated mean {Mean} from {Count} values for point {ItemId}", 
                mean, numericValues.Count, request.ItemId);

            return Ok(new PointMeanResponseDto
            {
                Success = true,
                Mean = mean,
                Count = numericValues.Count,
                ItemId = request.ItemId
            });
        }
        catch (FormatException ex)
        {
            _logger.LogError(ex, "Invalid GUID format for ItemId: {ItemId}", request?.ItemId);
            return BadRequest(new PointMeanResponseDto
            {
                Success = false,
                ErrorMessage = "Invalid item ID format",
                ItemId = request?.ItemId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating mean for point {ItemId}", request?.ItemId);
            return StatusCode(500, new PointMeanResponseDto
            {
                Success = false,
                ErrorMessage = "Internal server error while calculating mean",
                ItemId = request?.ItemId
            });
        }
    }

    /// <summary>
    /// Calculate the minimum value for an analog point within a specified date range
    /// </summary>
    /// <param name="request">Request containing item ID, start date, and end date (Unix timestamps in seconds)</param>
    /// <returns>Minimum value for the specified analog point and time period</returns>
    /// <remarks>
    /// This endpoint only works for analog points (AnalogInput and AnalogOutput).
    /// For digital points, it will return an error as min calculation is meaningless for binary values.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/pointmin
    ///     {
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "startDate": 1697587200,
    ///        "endDate": 1697673600
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns the minimum value and data point count</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If the point is not analog or validation fails</response>
    /// <response code="404">If the point is not found</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("PointMin")]
    [ProducesResponseType(typeof(PointMinResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> PointMin([FromBody] PointMinRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Unauthorized access attempt to PointMin endpoint (no user id)");
                return Unauthorized();
            }

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("Validation failed for PointMin request by {UserId}: {Errors}", userId, string.Join("; ", errors));

                return BadRequest(new PointMinResponseDto
                {
                    Success = false,
                    ErrorMessage = $"Validation failed: {string.Join("; ", errors)}"
                });
            }

            // Default to last 24 hours if dates not provided
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var startDate = request.StartDate ?? now - (24 * 60 * 60); // 24 hours ago
            var endDate = request.EndDate ?? now;

            _logger.LogInformation("Calculating minimum for point {ItemId} from {StartDate} to {EndDate} by user {UserId}", 
                request.ItemId, startDate, endDate, userId);

            var itemGuid = Guid.Parse(request.ItemId!);
            var monitoringItem = await Core.Points.GetPoint(itemGuid);

            if (monitoringItem == null)
            {
                _logger.LogWarning("Point {ItemId} not found for min calculation", request.ItemId);
                return NotFound(new PointMinResponseDto
                {
                    Success = false,
                    ErrorMessage = "Point not found",
                    ItemId = request.ItemId
                });
            }

            if (monitoringItem.ItemType != ItemType.AnalogInput && 
                monitoringItem.ItemType != ItemType.AnalogOutput)
            {
                _logger.LogWarning("Attempted to calculate min for non-analog point {ItemId} of type {ItemType}", 
                    request.ItemId, monitoringItem.ItemType);
                
                return BadRequest(new PointMinResponseDto
                {
                    Success = false,
                    ErrorMessage = $"Min calculation is only supported for analog points. This point is of type: {monitoringItem.ItemType}",
                    ItemId = request.ItemId
                });
            }

            var values = await Core.Points.GetHistory(request.ItemId!, startDate, endDate);

            if (values == null || values.Count == 0)
            {
                _logger.LogInformation("No data found for point {ItemId} in the specified range", request.ItemId);
                return Ok(new PointMinResponseDto
                {
                    Success = true,
                    Min = null,
                    Count = 0,
                    ItemId = request.ItemId,
                    ErrorMessage = "No data available for the specified time range"
                });
            }

            var numericValues = new List<double>();
            foreach (var v in values)
            {
                if (double.TryParse(v.Value, out double numericValue))
                {
                    numericValues.Add(numericValue);
                }
            }

            if (numericValues.Count == 0)
            {
                _logger.LogWarning("No valid numeric values found for point {ItemId}", request.ItemId);
                return Ok(new PointMinResponseDto
                {
                    Success = true,
                    Min = null,
                    Count = 0,
                    ItemId = request.ItemId,
                    ErrorMessage = "No valid numeric values found in the specified time range"
                });
            }

            var min = numericValues.Min();

            _logger.LogInformation("Successfully calculated min {Min} from {Count} values for point {ItemId}", 
                min, numericValues.Count, request.ItemId);

            return Ok(new PointMinResponseDto
            {
                Success = true,
                Min = min,
                Count = numericValues.Count,
                ItemId = request.ItemId
            });
        }
        catch (FormatException ex)
        {
            _logger.LogError(ex, "Invalid GUID format for ItemId: {ItemId}", request?.ItemId);
            return BadRequest(new PointMinResponseDto
            {
                Success = false,
                ErrorMessage = "Invalid item ID format",
                ItemId = request?.ItemId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating min for point {ItemId}", request?.ItemId);
            return StatusCode(500, new PointMinResponseDto
            {
                Success = false,
                ErrorMessage = "Internal server error while calculating min",
                ItemId = request?.ItemId
            });
        }
    }

    /// <summary>
    /// Calculate the maximum value for an analog point within a specified date range
    /// </summary>
    /// <param name="request">Request containing item ID, start date, and end date (Unix timestamps in seconds)</param>
    /// <returns>Maximum value for the specified analog point and time period</returns>
    /// <remarks>
    /// This endpoint only works for analog points (AnalogInput and AnalogOutput).
    /// For digital points, it will return an error as max calculation is meaningless for binary values.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/pointmax
    ///     {
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "startDate": 1697587200,
    ///        "endDate": 1697673600
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns the maximum value and data point count</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If the point is not analog or validation fails</response>
    /// <response code="404">If the point is not found</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("PointMax")]
    [ProducesResponseType(typeof(PointMaxResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> PointMax([FromBody] PointMaxRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Unauthorized access attempt to PointMax endpoint (no user id)");
                return Unauthorized();
            }

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("Validation failed for PointMax request by {UserId}: {Errors}", userId, string.Join("; ", errors));

                return BadRequest(new PointMaxResponseDto
                {
                    Success = false,
                    ErrorMessage = $"Validation failed: {string.Join("; ", errors)}"
                });
            }

            // Default to last 24 hours if dates not provided
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var startDate = request.StartDate ?? now - (24 * 60 * 60); // 24 hours ago
            var endDate = request.EndDate ?? now;

            _logger.LogInformation("Calculating maximum for point {ItemId} from {StartDate} to {EndDate} by user {UserId}", 
                request.ItemId, startDate, endDate, userId);

            var itemGuid = Guid.Parse(request.ItemId!);
            var monitoringItem = await Core.Points.GetPoint(itemGuid);

            if (monitoringItem == null)
            {
                _logger.LogWarning("Point {ItemId} not found for max calculation", request.ItemId);
                return NotFound(new PointMaxResponseDto
                {
                    Success = false,
                    ErrorMessage = "Point not found",
                    ItemId = request.ItemId
                });
            }

            if (monitoringItem.ItemType != ItemType.AnalogInput && 
                monitoringItem.ItemType != ItemType.AnalogOutput)
            {
                _logger.LogWarning("Attempted to calculate max for non-analog point {ItemId} of type {ItemType}", 
                    request.ItemId, monitoringItem.ItemType);
                
                return BadRequest(new PointMaxResponseDto
                {
                    Success = false,
                    ErrorMessage = $"Max calculation is only supported for analog points. This point is of type: {monitoringItem.ItemType}",
                    ItemId = request.ItemId
                });
            }

            var values = await Core.Points.GetHistory(request.ItemId!, startDate, endDate);

            if (values == null || values.Count == 0)
            {
                _logger.LogInformation("No data found for point {ItemId} in the specified range", request.ItemId);
                return Ok(new PointMaxResponseDto
                {
                    Success = true,
                    Max = null,
                    Count = 0,
                    ItemId = request.ItemId,
                    ErrorMessage = "No data available for the specified time range"
                });
            }

            var numericValues = new List<double>();
            foreach (var v in values)
            {
                if (double.TryParse(v.Value, out double numericValue))
                {
                    numericValues.Add(numericValue);
                }
            }

            if (numericValues.Count == 0)
            {
                _logger.LogWarning("No valid numeric values found for point {ItemId}", request.ItemId);
                return Ok(new PointMaxResponseDto
                {
                    Success = true,
                    Max = null,
                    Count = 0,
                    ItemId = request.ItemId,
                    ErrorMessage = "No valid numeric values found in the specified time range"
                });
            }

            var max = numericValues.Max();

            _logger.LogInformation("Successfully calculated max {Max} from {Count} values for point {ItemId}", 
                max, numericValues.Count, request.ItemId);

            return Ok(new PointMaxResponseDto
            {
                Success = true,
                Max = max,
                Count = numericValues.Count,
                ItemId = request.ItemId
            });
        }
        catch (FormatException ex)
        {
            _logger.LogError(ex, "Invalid GUID format for ItemId: {ItemId}", request?.ItemId);
            return BadRequest(new PointMaxResponseDto
            {
                Success = false,
                ErrorMessage = "Invalid item ID format",
                ItemId = request?.ItemId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating max for point {ItemId}", request?.ItemId);
            return StatusCode(500, new PointMaxResponseDto
            {
                Success = false,
                ErrorMessage = "Internal server error while calculating max",
                ItemId = request?.ItemId
            });
        }
    }

    /// <summary>
    /// Calculate the standard deviation for an analog point within a specified date range
    /// </summary>
    /// <param name="request">Request containing item ID, start date, and end date (Unix timestamps in seconds)</param>
    /// <returns>Standard deviation for the specified analog point and time period</returns>
    /// <remarks>
    /// This endpoint only works for analog points (AnalogInput and AnalogOutput).
    /// For digital points, it will return an error as standard deviation is meaningless for binary values.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/pointstd
    ///     {
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "startDate": 1697587200,
    ///        "endDate": 1697673600
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns the standard deviation and data point count</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If the point is not analog or validation fails</response>
    /// <response code="404">If the point is not found</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("PointStd")]
    [ProducesResponseType(typeof(PointStdResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> PointStd([FromBody] PointStdRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Unauthorized access attempt to PointStd endpoint (no user id)");
                return Unauthorized();
            }

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("Validation failed for PointStd request by {UserId}: {Errors}", userId, string.Join("; ", errors));

                return BadRequest(new PointStdResponseDto
                {
                    Success = false,
                    ErrorMessage = $"Validation failed: {string.Join("; ", errors)}"
                });
            }

            // Default to last 24 hours if dates not provided
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var startDate = request.StartDate ?? now - (24 * 60 * 60); // 24 hours ago
            var endDate = request.EndDate ?? now;

            _logger.LogInformation("Calculating standard deviation for point {ItemId} from {StartDate} to {EndDate} by user {UserId}", 
                request.ItemId, startDate, endDate, userId);

            var itemGuid = Guid.Parse(request.ItemId!);
            var monitoringItem = await Core.Points.GetPoint(itemGuid);

            if (monitoringItem == null)
            {
                _logger.LogWarning("Point {ItemId} not found for std calculation", request.ItemId);
                return NotFound(new PointStdResponseDto
                {
                    Success = false,
                    ErrorMessage = "Point not found",
                    ItemId = request.ItemId
                });
            }

            if (monitoringItem.ItemType != ItemType.AnalogInput && 
                monitoringItem.ItemType != ItemType.AnalogOutput)
            {
                _logger.LogWarning("Attempted to calculate std for non-analog point {ItemId} of type {ItemType}", 
                    request.ItemId, monitoringItem.ItemType);
                
                return BadRequest(new PointStdResponseDto
                {
                    Success = false,
                    ErrorMessage = $"Standard deviation calculation is only supported for analog points. This point is of type: {monitoringItem.ItemType}",
                    ItemId = request.ItemId
                });
            }

            var values = await Core.Points.GetHistory(request.ItemId!, startDate, endDate);

            if (values == null || values.Count == 0)
            {
                _logger.LogInformation("No data found for point {ItemId} in the specified range", request.ItemId);
                return Ok(new PointStdResponseDto
                {
                    Success = true,
                    Std = null,
                    Count = 0,
                    ItemId = request.ItemId,
                    ErrorMessage = "No data available for the specified time range"
                });
            }

            var numericValues = new List<double>();
            foreach (var v in values)
            {
                if (double.TryParse(v.Value, out double numericValue))
                {
                    numericValues.Add(numericValue);
                }
            }

            if (numericValues.Count == 0)
            {
                _logger.LogWarning("No valid numeric values found for point {ItemId}", request.ItemId);
                return Ok(new PointStdResponseDto
                {
                    Success = true,
                    Std = null,
                    Count = 0,
                    ItemId = request.ItemId,
                    ErrorMessage = "No valid numeric values found in the specified time range"
                });
            }

            if (numericValues.Count < 2)
            {
                _logger.LogWarning("Insufficient data points for std calculation for point {ItemId}", request.ItemId);
                return Ok(new PointStdResponseDto
                {
                    Success = true,
                    Std = null,
                    Count = numericValues.Count,
                    ItemId = request.ItemId,
                    ErrorMessage = "At least 2 data points are required for standard deviation calculation"
                });
            }

            var mean = numericValues.Average();
            var sumOfSquares = numericValues.Sum(val => Math.Pow(val - mean, 2));
            var std = Math.Sqrt(sumOfSquares / numericValues.Count);

            _logger.LogInformation("Successfully calculated std {Std} from {Count} values for point {ItemId}", 
                std, numericValues.Count, request.ItemId);

            return Ok(new PointStdResponseDto
            {
                Success = true,
                Std = std,
                Count = numericValues.Count,
                ItemId = request.ItemId
            });
        }
        catch (FormatException ex)
        {
            _logger.LogError(ex, "Invalid GUID format for ItemId: {ItemId}", request?.ItemId);
            return BadRequest(new PointStdResponseDto
            {
                Success = false,
                ErrorMessage = "Invalid item ID format",
                ItemId = request?.ItemId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating std for point {ItemId}", request?.ItemId);
            return StatusCode(500, new PointStdResponseDto
            {
                Success = false,
                ErrorMessage = "Internal server error while calculating std",
                ItemId = request?.ItemId
            });
        }
    }

    /// <summary>
    /// Count the number of data points for a monitoring point within a specified date range
    /// </summary>
    /// <param name="request">Request containing item ID, start date, and end date (Unix timestamps in seconds)</param>
    /// <returns>Count of data points for the specified point and time period</returns>
    /// <remarks>
    /// This endpoint works for both analog and digital points.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/pointcount
    ///     {
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "startDate": 1697587200,
    ///        "endDate": 1697673600
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns the count of data points</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If validation fails</response>
    /// <response code="404">If the point is not found</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("PointCount")]
    [ProducesResponseType(typeof(PointCountResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> PointCount([FromBody] PointCountRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Unauthorized access attempt to PointCount endpoint (no user id)");
                return Unauthorized();
            }

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("Validation failed for PointCount request by {UserId}: {Errors}", userId, string.Join("; ", errors));

                return BadRequest(new PointCountResponseDto
                {
                    Success = false,
                    ErrorMessage = $"Validation failed: {string.Join("; ", errors)}"
                });
            }

            // Default to last 24 hours if dates not provided
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var startDate = request.StartDate ?? now - (24 * 60 * 60); // 24 hours ago
            var endDate = request.EndDate ?? now;

            _logger.LogInformation("Counting data points for point {ItemId} from {StartDate} to {EndDate} by user {UserId}", 
                request.ItemId, startDate, endDate, userId);

            var itemGuid = Guid.Parse(request.ItemId!);
            var monitoringItem = await Core.Points.GetPoint(itemGuid);

            if (monitoringItem == null)
            {
                _logger.LogWarning("Point {ItemId} not found for count", request.ItemId);
                return NotFound(new PointCountResponseDto
                {
                    Success = false,
                    ErrorMessage = "Point not found",
                    ItemId = request.ItemId
                });
            }

            var values = await Core.Points.GetHistory(request.ItemId!, startDate, endDate);

            if (values == null || values.Count == 0)
            {
                _logger.LogInformation("No data found for point {ItemId} in the specified range", request.ItemId);
                return Ok(new PointCountResponseDto
                {
                    Success = true,
                    Count = 0,
                    ItemId = request.ItemId
                });
            }

            _logger.LogInformation("Successfully counted {Count} values for point {ItemId}", 
                values.Count, request.ItemId);

            return Ok(new PointCountResponseDto
            {
                Success = true,
                Count = values.Count,
                ItemId = request.ItemId
            });
        }
        catch (FormatException ex)
        {
            _logger.LogError(ex, "Invalid GUID format for ItemId: {ItemId}", request?.ItemId);
            return BadRequest(new PointCountResponseDto
            {
                Success = false,
                ErrorMessage = "Invalid item ID format",
                ItemId = request?.ItemId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error counting for point {ItemId}", request?.ItemId);
            return StatusCode(500, new PointCountResponseDto
            {
                Success = false,
                ErrorMessage = "Internal server error while counting",
                ItemId = request?.ItemId
            });
        }
    }

    /// <summary>
    /// Calculate the minimum value grouped by the requested calendar (Jalali or Gregorian) for an analog point within a time range
    /// </summary>
    /// <param name="request">Request containing point ID, start date, and end date (Unix epoch seconds)</param>
    /// <returns>Daily minimum values in Jalali calendar format with Iran Standard Time</returns>
    /// <remarks>
    /// This endpoint groups data by the requested calendar using Iran Standard Time (UTC+3:30).
    /// Only works for analog points (AnalogInput, AnalogOutput).
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/pointminbydate
    ///     {
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "startDate": 1697587200,
    ///        "endDate": 1697673600,
    ///        "calendar": "jalali" // or "gregorian"
    ///     }
    ///     
    /// Sample response:
    /// 
    ///     {
    ///        "success": true,
    ///        "dailyValues": [
    ///          {
    ///            "date": "1403/09/16",
    ///            "value": 23.5,
    ///            "count": 144
    ///          }
    ///        ]
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns the daily minimum values</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If validation fails or point is not analog</response>
    /// <response code="404">If the point is not found</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("PointMinByDate")]
    [ProducesResponseType(typeof(PointMinByDateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> PointMinByDate([FromBody] PointMinByDateRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Unauthorized access attempt to PointMinByDate endpoint (no user id)");
                return Unauthorized();
            }

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("Validation failed for PointMinByDate request by {UserId}: {Errors}", userId, string.Join("; ", errors));

                return BadRequest(new PointMinByDateResponseDto
                {
                    Success = false,
                    ErrorMessage = $"Validation failed: {string.Join("; ", errors)}"
                });
            }

            _logger.LogInformation("Calculating daily minimum for point {ItemId} from {StartDate} to {EndDate} by user {UserId}", 
                request.ItemId, request.StartDate, request.EndDate, userId);

            var itemGuid = Guid.Parse(request.ItemId!);
            var monitoringItem = await Core.Points.GetPoint(itemGuid);

            if (monitoringItem == null)
            {
                _logger.LogWarning("Point {ItemId} not found for daily minimum", request.ItemId);
                return NotFound(new PointMinByDateResponseDto
                {
                    Success = false,
                    ErrorMessage = "Point not found",
                    ItemId = request.ItemId
                });
            }

            if (monitoringItem.ItemType != ItemType.AnalogInput && monitoringItem.ItemType != ItemType.AnalogOutput)
            {
                _logger.LogWarning("Point {ItemId} is not an analog point (type: {ItemType}), minimum by date calculation is not applicable", 
                    request.ItemId, monitoringItem.ItemType);
                return BadRequest(new PointMinByDateResponseDto
                {
                    Success = false,
                    ErrorMessage = "Minimum calculation is only meaningful for analog points",
                    ItemId = request.ItemId
                });
            }

            var values = await Core.Points.GetHistory(request.ItemId!, request.StartDate, request.EndDate);

            if (values == null || values.Count == 0)
            {
                _logger.LogInformation("No data found for point {ItemId} in the specified range", request.ItemId);
                return Ok(new PointMinByDateResponseDto
                {
                    Success = true,
                    ItemId = request.ItemId,
                    DailyValues = new List<DailyMinValue>()
                });
            }

            var iranTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Iran Standard Time");
            var persianCalendar = new System.Globalization.PersianCalendar();
            var calendar = (request.Calendar ?? "jalali").ToLowerInvariant();

            string FormatDate(DateTimeOffset utcTime)
            {
                var localTime = TimeZoneInfo.ConvertTime(utcTime, iranTimeZone);
                if (calendar == "gregorian")
                {
                    return localTime.ToString("yyyy/MM/dd");
                }

                var year = persianCalendar.GetYear(localTime.DateTime);
                var month = persianCalendar.GetMonth(localTime.DateTime);
                var day = persianCalendar.GetDayOfMonth(localTime.DateTime);
                return $"{year:D4}/{month:D2}/{day:D2}";
            }

            // Parse string values to doubles and group by date
            var parsedValues = new List<(string Date, double Value)>();
            foreach (var v in values)
            {
                if (double.TryParse(v.Value, out double numericValue))
                {
                    var utcTime = DateTimeOffset.FromUnixTimeSeconds(v.Time);
                    parsedValues.Add((FormatDate(utcTime), numericValue));
                }
            }

            if (parsedValues.Count == 0)
            {
                _logger.LogWarning("No valid numeric values found for point {ItemId}", request.ItemId);
                return Ok(new PointMinByDateResponseDto
                {
                    Success = true,
                    ItemId = request.ItemId,
                    DailyValues = new List<DailyMinValue>(),
                    ErrorMessage = "No valid numeric values found in the specified time range"
                });
            }

            var dailyGroups = parsedValues
                .GroupBy(v => v.Date)
                .Select(g => new DailyMinValue
                {
                    Date = g.Key,
                    Value = g.Min(v => v.Value),
                    Count = g.Count()
                })
                .OrderBy(d => d.Date)
                .ToList();

            _logger.LogInformation("Successfully calculated daily minimums for point {ItemId} across {Days} days", 
                request.ItemId, dailyGroups.Count);

            return Ok(new PointMinByDateResponseDto
            {
                Success = true,
                ItemId = request.ItemId,
                DailyValues = dailyGroups
            });
        }
        catch (FormatException ex)
        {
            _logger.LogError(ex, "Invalid GUID format for ItemId: {ItemId}", request?.ItemId);
            return BadRequest(new PointMinByDateResponseDto
            {
                Success = false,
                ErrorMessage = "Invalid item ID format",
                ItemId = request?.ItemId
            });
        }
        catch (TimeZoneNotFoundException ex)
        {
            _logger.LogError(ex, "Iran Standard Time zone not found on this system");
            return StatusCode(500, new PointMinByDateResponseDto
            {
                Success = false,
                ErrorMessage = "Time zone configuration error",
                ItemId = request?.ItemId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating daily minimum for point {ItemId}", request?.ItemId);
            return StatusCode(500, new PointMinByDateResponseDto
            {
                Success = false,
                ErrorMessage = "Internal server error while calculating daily minimum",
                ItemId = request?.ItemId
            });
        }
    }

    /// <summary>
    /// Calculate the maximum value grouped by the requested calendar (Jalali or Gregorian) for an analog point within a time range
    /// </summary>
    [HttpPost("PointMaxByDate")]
    [ProducesResponseType(typeof(PointMaxByDateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> PointMaxByDate([FromBody] PointMaxByDateRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) { _logger.LogWarning("Unauthorized access attempt to PointMaxByDate endpoint"); return Unauthorized(); }
            if (!ModelState.IsValid) { var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList(); return BadRequest(new PointMaxByDateResponseDto { Success = false, ErrorMessage = $"Validation failed: {string.Join("; ", errors)}" }); }
            var itemGuid = Guid.Parse(request.ItemId!);
            var monitoringItem = await Core.Points.GetPoint(itemGuid);
            if (monitoringItem == null) { return NotFound(new PointMaxByDateResponseDto { Success = false, ErrorMessage = "Point not found", ItemId = request.ItemId }); }
            if (monitoringItem.ItemType != ItemType.AnalogInput && monitoringItem.ItemType != ItemType.AnalogOutput) { return BadRequest(new PointMaxByDateResponseDto { Success = false, ErrorMessage = "Maximum calculation is only meaningful for analog points", ItemId = request.ItemId }); }
            var values = await Core.Points.GetHistory(request.ItemId!, request.StartDate, request.EndDate);
            if (values == null || values.Count == 0) { return Ok(new PointMaxByDateResponseDto { Success = true, ItemId = request.ItemId, DailyValues = new List<DailyMaxValue>() }); }
            var iranTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Iran Standard Time");
            var persianCalendar = new System.Globalization.PersianCalendar();
            var calendar = (request.Calendar ?? "jalali").ToLowerInvariant();

            string FormatDate(DateTimeOffset utcTime)
            {
                var localTime = TimeZoneInfo.ConvertTime(utcTime, iranTimeZone);
                if (calendar == "gregorian")
                {
                    return localTime.ToString("yyyy/MM/dd");
                }

                var year = persianCalendar.GetYear(localTime.DateTime);
                var month = persianCalendar.GetMonth(localTime.DateTime);
                var day = persianCalendar.GetDayOfMonth(localTime.DateTime);
                return $"{year:D4}/{month:D2}/{day:D2}";
            }

            var parsedValues = new List<(string Date, double Value)>();
            foreach (var v in values)
            {
                if (double.TryParse(v.Value, out double numericValue))
                {
                    var utcTime = DateTimeOffset.FromUnixTimeSeconds(v.Time);
                    parsedValues.Add((FormatDate(utcTime), numericValue));
                }
            }
            if (parsedValues.Count == 0) { return Ok(new PointMaxByDateResponseDto { Success = true, ItemId = request.ItemId, DailyValues = new List<DailyMaxValue>() }); }
            var dailyGroups = parsedValues.GroupBy(v => v.Date).Select(g => new DailyMaxValue { Date = g.Key, Value = g.Max(v => v.Value), Count = g.Count() }).OrderBy(d => d.Date).ToList();
            return Ok(new PointMaxByDateResponseDto { Success = true, ItemId = request.ItemId, DailyValues = dailyGroups });
        }
        catch (Exception ex) { _logger.LogError(ex, "Error calculating daily maximum"); return StatusCode(500, new PointMaxByDateResponseDto { Success = false, ErrorMessage = "Internal server error", ItemId = request?.ItemId }); }
    }

    /// <summary>
    /// Calculate the mean (average) value grouped by the requested calendar (Jalali or Gregorian) for an analog point within a time range
    /// </summary>
    [HttpPost("PointMeanByDate")]
    [ProducesResponseType(typeof(PointMeanByDateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> PointMeanByDate([FromBody] PointMeanByDateRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) { return Unauthorized(); }
            if (!ModelState.IsValid) { var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList(); return BadRequest(new PointMeanByDateResponseDto { Success = false, ErrorMessage = $"Validation failed: {string.Join("; ", errors)}" }); }
            var itemGuid = Guid.Parse(request.ItemId!);
            var monitoringItem = await Core.Points.GetPoint(itemGuid);
            if (monitoringItem == null) { return NotFound(new PointMeanByDateResponseDto { Success = false, ErrorMessage = "Point not found", ItemId = request.ItemId }); }
            if (monitoringItem.ItemType != ItemType.AnalogInput && monitoringItem.ItemType != ItemType.AnalogOutput) { return BadRequest(new PointMeanByDateResponseDto { Success = false, ErrorMessage = "Mean calculation is only meaningful for analog points", ItemId = request.ItemId }); }
            var values = await Core.Points.GetHistory(request.ItemId!, request.StartDate, request.EndDate);
            if (values == null || values.Count == 0) { return Ok(new PointMeanByDateResponseDto { Success = true, ItemId = request.ItemId, DailyValues = new List<DailyMeanValue>() }); }
            var iranTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Iran Standard Time");
            var persianCalendar = new System.Globalization.PersianCalendar();
            var calendar = (request.Calendar ?? "jalali").ToLowerInvariant();

            string FormatDate(DateTimeOffset utcTime)
            {
                var localTime = TimeZoneInfo.ConvertTime(utcTime, iranTimeZone);
                if (calendar == "gregorian")
                {
                    return localTime.ToString("yyyy/MM/dd");
                }

                var year = persianCalendar.GetYear(localTime.DateTime);
                var month = persianCalendar.GetMonth(localTime.DateTime);
                var day = persianCalendar.GetDayOfMonth(localTime.DateTime);
                return $"{year:D4}/{month:D2}/{day:D2}";
            }

            var parsedValues = new List<(string Date, double Value)>();
            foreach (var v in values)
            {
                if (double.TryParse(v.Value, out double numericValue))
                {
                    var utcTime = DateTimeOffset.FromUnixTimeSeconds(v.Time);
                    parsedValues.Add((FormatDate(utcTime), numericValue));
                }
            }
            if (parsedValues.Count == 0) { return Ok(new PointMeanByDateResponseDto { Success = true, ItemId = request.ItemId, DailyValues = new List<DailyMeanValue>() }); }
            var dailyGroups = parsedValues.GroupBy(v => v.Date).Select(g => new DailyMeanValue { Date = g.Key, Value = g.Average(v => v.Value), Count = g.Count() }).OrderBy(d => d.Date).ToList();
            return Ok(new PointMeanByDateResponseDto { Success = true, ItemId = request.ItemId, DailyValues = dailyGroups });
        }
        catch (Exception ex) { _logger.LogError(ex, "Error calculating daily mean"); return StatusCode(500, new PointMeanByDateResponseDto { Success = false, ErrorMessage = "Internal server error", ItemId = request?.ItemId }); }
    }

    /// <summary>
    /// Calculate the standard deviation grouped by the requested calendar (Jalali or Gregorian) for an analog point within a time range
    /// </summary>
    [HttpPost("PointStdByDate")]
    [ProducesResponseType(typeof(PointStdByDateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> PointStdByDate([FromBody] PointStdByDateRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) { return Unauthorized(); }
            if (!ModelState.IsValid) { var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList(); return BadRequest(new PointStdByDateResponseDto { Success = false, ErrorMessage = $"Validation failed: {string.Join("; ", errors)}" }); }
            var itemGuid = Guid.Parse(request.ItemId!);
            var monitoringItem = await Core.Points.GetPoint(itemGuid);
            if (monitoringItem == null) { return NotFound(new PointStdByDateResponseDto { Success = false, ErrorMessage = "Point not found", ItemId = request.ItemId }); }
            if (monitoringItem.ItemType != ItemType.AnalogInput && monitoringItem.ItemType != ItemType.AnalogOutput) { return BadRequest(new PointStdByDateResponseDto { Success = false, ErrorMessage = "Standard deviation calculation is only meaningful for analog points", ItemId = request.ItemId }); }
            var values = await Core.Points.GetHistory(request.ItemId!, request.StartDate, request.EndDate);
            if (values == null || values.Count == 0) { return Ok(new PointStdByDateResponseDto { Success = true, ItemId = request.ItemId, DailyValues = new List<DailyStdValue>() }); }
            var iranTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Iran Standard Time");
            var persianCalendar = new System.Globalization.PersianCalendar();
            var calendar = (request.Calendar ?? "jalali").ToLowerInvariant();

            string FormatDate(DateTimeOffset utcTime)
            {
                var localTime = TimeZoneInfo.ConvertTime(utcTime, iranTimeZone);
                if (calendar == "gregorian")
                {
                    return localTime.ToString("yyyy/MM/dd");
                }

                var year = persianCalendar.GetYear(localTime.DateTime);
                var month = persianCalendar.GetMonth(localTime.DateTime);
                var day = persianCalendar.GetDayOfMonth(localTime.DateTime);
                return $"{year:D4}/{month:D2}/{day:D2}";
            }

            var parsedValues = new List<(string Date, double Value)>();
            foreach (var v in values)
            {
                if (double.TryParse(v.Value, out double numericValue))
                {
                    var utcTime = DateTimeOffset.FromUnixTimeSeconds(v.Time);
                    parsedValues.Add((FormatDate(utcTime), numericValue));
                }
            }
            if (parsedValues.Count == 0) { return Ok(new PointStdByDateResponseDto { Success = true, ItemId = request.ItemId, DailyValues = new List<DailyStdValue>() }); }
            var dailyGroups = parsedValues.GroupBy(v => v.Date).Where(g => g.Count() >= 2).Select(g => { var vals = g.Select(x => x.Value).ToList(); var mean = vals.Average(); var variance = vals.Sum(val => Math.Pow(val - mean, 2)) / vals.Count; return new DailyStdValue { Date = g.Key, Value = Math.Sqrt(variance), Count = vals.Count }; }).OrderBy(d => d.Date).ToList();
            return Ok(new PointStdByDateResponseDto { Success = true, ItemId = request.ItemId, DailyValues = dailyGroups });
        }
        catch (Exception ex) { _logger.LogError(ex, "Error calculating daily standard deviation"); return StatusCode(500, new PointStdByDateResponseDto { Success = false, ErrorMessage = "Internal server error", ItemId = request?.ItemId }); }
    }

    /// <summary>
    /// Count data points grouped by the requested calendar (Jalali or Gregorian) within a time range (works for both analog and digital points)
    /// </summary>
    [HttpPost("PointCountByDate")]
    [ProducesResponseType(typeof(PointCountByDateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> PointCountByDate([FromBody] PointCountByDateRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) { return Unauthorized(); }
            if (!ModelState.IsValid) { var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList(); return BadRequest(new PointCountByDateResponseDto { Success = false, ErrorMessage = $"Validation failed: {string.Join("; ", errors)}" }); }
            var itemGuid = Guid.Parse(request.ItemId!);
            var monitoringItem = await Core.Points.GetPoint(itemGuid);
            if (monitoringItem == null) { return NotFound(new PointCountByDateResponseDto { Success = false, ErrorMessage = "Point not found", ItemId = request.ItemId }); }
            var values = await Core.Points.GetHistory(request.ItemId!, request.StartDate, request.EndDate);
            if (values == null || values.Count == 0) { return Ok(new PointCountByDateResponseDto { Success = true, ItemId = request.ItemId, DailyCounts = new List<DailyCount>() }); }
            var iranTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Iran Standard Time");
            var persianCalendar = new System.Globalization.PersianCalendar();
            var calendar = (request.Calendar ?? "jalali").ToLowerInvariant();

            string FormatDate(DateTimeOffset utcTime)
            {
                var localTime = TimeZoneInfo.ConvertTime(utcTime, iranTimeZone);
                if (calendar == "gregorian")
                {
                    return localTime.ToString("yyyy/MM/dd");
                }

                var year = persianCalendar.GetYear(localTime.DateTime);
                var month = persianCalendar.GetMonth(localTime.DateTime);
                var day = persianCalendar.GetDayOfMonth(localTime.DateTime);
                return $"{year:D4}/{month:D2}/{day:D2}";
            }

            var dailyGroups = values
                .GroupBy(v =>
                {
                    var utcTime = DateTimeOffset.FromUnixTimeSeconds(v.Time);
                    return FormatDate(utcTime);
                })
                .Select(g => new DailyCount { Date = g.Key, Count = g.Count() })
                .OrderBy(d => d.Date)
                .ToList();
            return Ok(new PointCountByDateResponseDto { Success = true, ItemId = request.ItemId, DailyCounts = dailyGroups });
        }
        catch (Exception ex) { _logger.LogError(ex, "Error counting by date"); return StatusCode(500, new PointCountByDateResponseDto { Success = false, ErrorMessage = "Internal server error", ItemId = request?.ItemId }); }
    }

    /// <summary>
    /// Get configured alarms for specified monitoring items
    /// </summary>
    /// <param name="request">Alarms request containing list of item IDs to retrieve alarms for</param>
    /// <returns>List of configured alarms for the specified items including English and Farsi messages</returns>
    /// <remarks>
    /// Sample request:
    /// 
    ///     POST /api/monitoring/alarms
    ///     {
    ///        "itemIds": ["550e8400-e29b-41d4-a716-446655440001"]
    ///     }
    ///     
    /// Leave itemIds empty or null to retrieve all alarms in the system.
    /// </remarks>
    /// <response code="200">Returns the configured alarms for monitoring items</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("Alarms")]
    [ProducesResponseType(typeof(AlarmsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Alarms([FromBody] AlarmsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Unauthorized access attempt to Alarms endpoint (no user id)");
                return Unauthorized();
            }

            // Ensure request is not null
            if (request == null)
            {
                _logger.LogWarning("Null request received for Alarms endpoint by user {UserId}", userId);
                return BadRequest(new { success = false, message = "Request body is required" });
            }

            // Validate model state
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("Validation failed for Alarms request by {UserId}: {Errors}", userId, string.Join("; ", errors));

                return BadRequest(new
                {
                    success = false,
                    message = "Validation failed",
                    errors = errors
                });
            }

            _logger.LogInformation("Fetching alarms for user {UserId} (items: {ItemCount})", userId, request?.ItemIds?.Count ?? 0);

            var alarms = await Core.Alarms.ListAlarms(request.ItemIds ?? new List<string>());

            var response = new AlarmsResponseDto();

            foreach (var a in alarms)
            {
                if (a.IsDeleted.HasValue && a.IsDeleted.Value)
                {
                    continue;
                }

                response.Data.Add(new AlarmsResponseDto.Alarm()
                {
                    Id = a.Id.ToString(),
                    ItemId = a.ItemId.ToString(),
                    AlarmType = (Share.Libs.AlarmType)a.AlarmType,
                    AlarmPriority = (Share.Libs.AlarmPriority)a.AlarmPriority,
                    CompareType = (Share.Libs.CompareType)a.CompareType,
                    IsDisabled = a.IsDisabled,
                    AlarmDelay = a.AlarmDelay,
                    Message = a.Message,
                    MessageFa = a.MessageFa,
                    Value1 = a.Value1,
                    Value2 = a.Value2,
                    Timeout = a.Timeout,
                    HasExternalAlarm = a.HasExternalAlarm,
                });
            }

            return Ok(new { success = true, data = response, message = "Alarms retrieved successfully" });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Validation error in Alarms endpoint for user {UserId}", User.FindFirstValue(ClaimTypes.NameIdentifier));
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized access in Alarms endpoint for user {UserId}", User.FindFirstValue(ClaimTypes.NameIdentifier));
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error in Alarms endpoint for user {UserId}", User.FindFirstValue(ClaimTypes.NameIdentifier));
            return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get currently active alarms for specified monitoring items
    /// </summary>
    /// <param name="request">Active alarms request containing optional list of item IDs to filter</param>
    /// <returns>List of currently active alarms with alarm configuration and timing information</returns>
    /// <remarks>
    /// Sample request:
    /// 
    ///     POST /api/monitoring/activealarms
    ///     {
    ///        "itemIds": ["3fa85f64-5717-4562-b3fc-2c963f66afa6"]
    ///     }
    ///     
    /// Leave itemIds empty or null to retrieve all active alarms in the system.
    /// </remarks>
    /// <response code="200">Returns the currently active alarms</response>
    /// <response code="400">Validation error - invalid request format</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("ActiveAlarms")]
    [ProducesResponseType(typeof(ActiveAlarmsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ActiveAlarms([FromBody] ActiveAlarmsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Unauthorized access attempt to ActiveAlarms endpoint (no user id)");
                return Unauthorized(new { success = false, message = "Unauthorized access" });
            }

            // Validate model state
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("Validation failed for ActiveAlarms request by user {UserId}: {Errors}", 
                    userId, string.Join("; ", errors));

                return BadRequest(new
                {
                    success = false,
                    message = "Validation failed",
                    errors = errors
                });
            }

            _logger.LogInformation("Fetching active alarms for user {UserId} (items: {ItemCount})", 
                userId, request?.ItemIds?.Count ?? 0);

            // Ensure request is not null
            if (request == null)
            {
                _logger.LogWarning("Null request received for ActiveAlarms endpoint by user {UserId}", userId);
                return BadRequest(new { success = false, message = "Request body is required" });
            }

            var alarms = await Core.Alarms.ActiveAlarms(request.ItemIds ?? new List<string>());

            var response = new ActiveAlarmsResponseDto();

            foreach (var a in alarms)
            {
                response.Data.Add(new ActiveAlarmsResponseDto.ActiveAlarm()
                {
                    Id = a.Id.ToString(),
                    AlarmId = a.AlarmId.ToString(),
                    ItemId = a.ItemId.ToString(),
                    Time = a.Time,
                });
            }

            _logger.LogInformation("Successfully retrieved {AlarmCount} active alarms for user {UserId}", 
                response.Data.Count, userId);

            return Ok(new { success = true, data = response, message = "Active alarms retrieved successfully" });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Validation error in ActiveAlarms endpoint for user {UserId}", 
                User.FindFirstValue(ClaimTypes.NameIdentifier));
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized access in ActiveAlarms endpoint for user {UserId}", 
                User.FindFirstValue(ClaimTypes.NameIdentifier));
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ActiveAlarms endpoint for user {UserId}: {Message}", 
                User.FindFirstValue(ClaimTypes.NameIdentifier), ex.Message);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get system settings version information for the current user
    /// </summary>
    /// <returns>System version and user-specific version information used for client-side cache invalidation</returns>
    /// <remarks>
    /// Retrieves version information to help clients determine when to refresh cached settings data.
    /// The Version field represents the global system settings version that changes when system-wide
    /// configuration is updated. The UserVersion field is user-specific and changes when that user's
    /// settings or permissions are modified.
    /// 
    /// Sample request:
    /// 
    ///     GET /api/monitoring/settingsversion
    ///     
    /// Sample response:
    /// 
    ///     {
    ///       "version": "1.0.2024.01",
    ///       "userVersion": "1.0.2024.01.user123"
    ///     }
    ///     
    /// Clients should store these values and compare them on subsequent requests to detect changes.
    /// </remarks>
    /// <response code="200">Returns the version information successfully</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="500">Internal server error</response>
    [HttpGet("SettingsVersion")]
    [ProducesResponseType(typeof(SettingsVersionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> SettingsVersion()
    {
        try
        {
            // Extract user ID from JWT token
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("SettingsVersion: Unauthorized access attempt (no user ID in token)");
                return Unauthorized(new { success = false, message = "User not authenticated" });
            }

            _logger.LogInformation("SettingsVersion: Retrieving version info for user {UserId}", userId);

            // Parse user GUID
            if (!Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogWarning("SettingsVersion: Invalid user ID format {UserId}", userId);
                return Unauthorized(new { success = false, message = "Invalid user ID format" });
            }

            // Retrieve system version
            var systemVersion = await Core.Settings.GetVersion();
            var version = systemVersion.ToString();
            
            _logger.LogDebug("SettingsVersion: System version is {Version}", version);

            // Retrieve user-specific version
            var userVersionRecord = await _context.UserVersions
                .FirstOrDefaultAsync(x => x.UserId == userGuid);

            var response = new SettingsVersionResponseDto
            {
                Version = version,
                UserVersion = userVersionRecord?.Version,
            };

            _logger.LogInformation(
                "SettingsVersion: Retrieved version info for user {UserId} - System: {SystemVersion}, User: {UserVersion}", 
                userId, 
                version, 
                userVersionRecord?.Version ?? "none");

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "SettingsVersion: Validation error for user {UserId}", 
                User.FindFirstValue(ClaimTypes.NameIdentifier));
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "SettingsVersion: Unauthorized access attempt for user {UserId}", 
                User.FindFirstValue(ClaimTypes.NameIdentifier));
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SettingsVersion: Error retrieving version info for user {UserId}", 
                User.FindFirstValue(ClaimTypes.NameIdentifier));
            return StatusCode(StatusCodes.Status500InternalServerError, 
                new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get SignalR hub metadata and connection information
    /// </summary>
    /// <returns>Complete SignalR hub documentation including methods, parameters, authentication, and connection examples</returns>
    /// <remarks>
    /// This endpoint provides comprehensive documentation for the MonitoringHub SignalR hub.
    /// Use this to understand:
    /// - How to connect to the hub
    /// - Available server methods (callable from client)
    /// - Available client methods (invoked by server)
    /// - Authentication requirements
    /// - Connection examples for JavaScript, C#, and Python
    /// 
    /// This is particularly useful for:
    /// - Frontend developers integrating SignalR
    /// - API consumers who need real-time updates
    /// - Automated documentation generation tools
    /// </remarks>
    /// <response code="200">Returns complete SignalR hub metadata</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpGet("SignalRHubInfo")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(SignalRHubInfoResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public IActionResult GetSignalRHubInfo()
    {
        try
        {
            _logger.LogInformation("SignalR hub info requested");

            var hubInfo = new SignalRHubInfoResponseDto
            {
                Success = true,
                Data = new SignalRHubData
                {
                    HubName = "MonitoringHub",
                    HubEndpoint = "/monitoringhub",
                    ConnectionUrl = "http://localhost:5030/monitoringhub",
                    Authentication = "JWT Bearer token required - provide via Authorization header or accessTokenFactory option",
                    SupportedTransports = new List<string> { "WebSockets", "ServerSentEvents", "LongPolling" },
                    
                    ServerMethods = new List<SignalRMethodInfo>
                    {
                        new SignalRMethodInfo
                        {
                            Name = "SubscribeToActiveAlarms",
                            Description = "Subscribe to receive real-time active alarms count updates. This is optional - server broadcasts to all connected clients automatically.",
                            Parameters = new List<SignalRParameterInfo>(),
                            Returns = "Task"
                        }
                    },
                    
                    ClientMethods = new List<SignalRMethodInfo>
                    {
                        new SignalRMethodInfo
                        {
                            Name = "ReceiveActiveAlarmsUpdate",
                            Description = "Receives active alarm count updates from the server when alarms change state. Called automatically by the server's background worker.",
                            Parameters = new List<SignalRParameterInfo>
                            {
                                new SignalRParameterInfo
                                {
                                    Name = "activeAlarmsCount",
                                    Type = "int",
                                    Description = "Current count of active alarms in the system"
                                }
                            },
                            Returns = "void"
                        },
                        new SignalRMethodInfo
                        {
                            Name = "ReceiveSettingsUpdate",
                            Description = "Receives notification that system settings have been updated. Triggered when an admin calls the PushUpdate endpoint. Clients should refresh their local data through their own background synchronization processes.",
                            Parameters = new List<SignalRParameterInfo>(),
                            Returns = "void"
                        }
                    },
                    
                    ConnectionExamples = new SignalRConnectionExamples
                    {
                        JavaScript = @"// Install: npm install @microsoft/signalr
import * as signalR from '@microsoft/signalr';

// Create connection with JWT token
const connection = new signalR.HubConnectionBuilder()
    .withUrl('http://localhost:5030/monitoringhub', {
        accessTokenFactory: () => localStorage.getItem('jwt_token')
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Information)
    .build();

// Register client methods to receive updates
connection.on('ReceiveActiveAlarmsUpdate', (activeAlarmsCount) => {
    console.log(`Active alarms: ${activeAlarmsCount}`);
    document.getElementById('alarmCount').textContent = activeAlarmsCount;
});

connection.on('ReceiveSettingsUpdate', () => {
    console.log('Settings updated - refreshing data...');
    // Trigger your application's data refresh logic
    refreshApplicationData();
});

// Handle connection events
connection.onclose((error) => {
    console.error('Connection closed:', error);
});

connection.onreconnecting((error) => {
    console.warn('Reconnecting...', error);
});

connection.onreconnected((connectionId) => {
    console.log('Reconnected:', connectionId);
});

// Start connection
await connection.start();
console.log('SignalR Connected');

// Optional: Explicitly subscribe
await connection.invoke('SubscribeToActiveAlarms');",
                        
                        CSharp = @"// Install: Microsoft.AspNetCore.SignalR.Client
using Microsoft.AspNetCore.SignalR.Client;

// Create connection with JWT token
var connection = new HubConnectionBuilder()
    .WithUrl(""http://localhost:5030/monitoringhub"", options =>
    {
        options.AccessTokenProvider = () => Task.FromResult(jwtToken);
    })
    .WithAutomaticReconnect()
    .Build();

// Register client methods to receive updates
connection.On<int>(""ReceiveActiveAlarmsUpdate"", (activeAlarmsCount) =>
{
    Console.WriteLine($""Active alarms: {activeAlarmsCount}"");
});

connection.On(""ReceiveSettingsUpdate"", () =>
{
    Console.WriteLine(""Settings updated - refreshing data..."");
    // Trigger your application's data refresh logic
    RefreshApplicationData();
});

// Handle connection events
connection.Closed += async (error) =>
{
    Console.WriteLine($""Connection closed: {error?.Message}"");
};

connection.Reconnecting += (error) =>
{
    Console.WriteLine(""Reconnecting..."");
    return Task.CompletedTask;
};

connection.Reconnected += (connectionId) =>
{
    Console.WriteLine($""Reconnected: {connectionId}"");
    return Task.CompletedTask;
};

// Start connection
await connection.StartAsync();
Console.WriteLine(""SignalR Connected"");

// Optional: Explicitly subscribe
await connection.InvokeAsync(""SubscribeToActiveAlarms"");",
                        
                        Python = @"# Install: pip install signalrcore
from signalrcore.hub_connection_builder import HubConnectionBuilder

# JWT token provider
def get_token():
    return your_jwt_token

# Create connection with JWT token
hub_connection = HubConnectionBuilder() \
    .with_url(""http://localhost:5030/monitoringhub"",
              options={
                  ""access_token_factory"": get_token,
                  ""verify_ssl"": False  # Only for development
              }) \
    .with_automatic_reconnect({
        ""type"": ""interval"",
        ""intervals"": [0, 2, 5, 10, 30]
    }) \
    .build()

# Register client methods to receive updates
hub_connection.on(""ReceiveActiveAlarmsUpdate"", lambda activeAlarmsCount: 
    print(f""Active alarms: {activeAlarmsCount}""))

hub_connection.on(""ReceiveSettingsUpdate"", lambda: 
    print(""Settings updated - refreshing data...""))

# Handle connection events
hub_connection.on_open(lambda: print(""Connection opened""))
hub_connection.on_close(lambda: print(""Connection closed""))
hub_connection.on_error(lambda error: print(f""Error: {error}""))

# Start connection
hub_connection.start()

# Optional: Explicitly subscribe
hub_connection.send(""SubscribeToActiveAlarms"", [])"
                    }
                }
            };

            return Ok(hubInfo);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving SignalR hub info");
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Trigger a settings update notification to all connected clients via SignalR
    /// </summary>
    /// <param name="request">Push update request containing optional message for audit logging</param>
    /// <returns>Result indicating success or failure with the number of clients notified</returns>
    /// <remarks>
    /// **Admin-only endpoint** that broadcasts a settings update notification to all connected SignalR clients.
    /// This triggers the ReceiveSettingsUpdate client method, prompting clients to refresh their local data
    /// through their own background synchronization processes.
    /// 
    /// **Use Cases:**
    /// - After making bulk configuration changes that affect multiple users
    /// - When critical system settings are updated and clients need immediate notification
    /// - To force a data refresh across all connected clients without waiting for their polling intervals
    /// - When troubleshooting client synchronization issues
    /// 
    /// **What happens when this endpoint is called:**
    /// 1. Validates the requesting user has Admin role
    /// 2. Increments the settings version in the database (Core.Settings.Init) - offline devices will detect this change on next startup
    /// 3. Broadcasts ReceiveSettingsUpdate() to all connected SignalR clients
    /// 4. Clients receive the notification and trigger their data refresh logic
    /// 5. Creates an audit log entry for compliance tracking with the new version number
    /// 6. Returns the count of connected clients that were notified
    /// 
    /// **Client Implementation:**
    /// Clients must register a handler for the ReceiveSettingsUpdate method:
    /// 
    /// JavaScript/TypeScript:
    /// ```javascript
    /// connection.on("ReceiveSettingsUpdate", () => {
    ///     console.log("Settings updated - refreshing data...");
    ///     // Trigger your application's data refresh logic
    ///     await refreshGroups();
    ///     await refreshItems();
    ///     await refreshAlarms();
    /// });
    /// ```
    /// 
    /// C#:
    /// ```csharp
    /// connection.On("ReceiveSettingsUpdate", () =>
    /// {
    ///     Console.WriteLine("Settings updated - refreshing data...");
    ///     // Trigger your application's data refresh logic
    ///     RefreshApplicationData();
    /// });
    /// ```
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/pushupdate
    ///     {
    ///        "message": "Manual settings refresh triggered after bulk configuration update"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Settings update notification successfully broadcasted to all connected clients</response>
    /// <response code="400">Validation error - invalid request format</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - Admin role required</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("PushUpdate")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(PushUpdateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> PushUpdate([FromBody] PushUpdateRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userName = User.Identity?.Name ?? "Unknown";
            
            _logger.LogInformation("PushUpdate started: User {UserName} (ID: {UserId}), Message: {Message}", 
                userName, userId, request.Message ?? "No message provided");

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("PushUpdate validation failed for user {UserName}", userName);
                return BadRequest(new PushUpdateResponseDto 
                { 
                    Success = false, 
                    Message = "Invalid request data" 
                });
            }

            // Get count of connected clients
            var connectedClientsCount = _connectionTracker.GetTotalConnectionCount();
            var connectedUsersCount = _connectionTracker.GetOnlineUserCount();

            _logger.LogInformation("Broadcasting settings update to {ClientCount} connections ({UserCount} unique users)", 
                connectedClientsCount, connectedUsersCount);

            // Update settings version in database so offline devices will detect change on next startup
            _logger.LogDebug("PushUpdate: Incrementing settings version in database");
            await Core.Settings.Init();
            
            var newVersion = await Core.Settings.GetVersion();
            _logger.LogInformation("PushUpdate: Settings version updated to {Version}", newVersion);

            // Broadcast settings update notification to all connected clients
            await _hubContext.Clients.All.SendAsync("ReceiveSettingsUpdate");

            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            // Create audit log entry using EditGroup as the closest existing log type for system configuration changes
            await _auditService.LogAsync(
                LogType.EditGroup,
                new
                {
                    Action = "PushUpdate",
                    UserName = userName,
                    Message = request.Message ?? "No message provided",
                    NewVersion = newVersion.ToString(),
                    ClientsNotified = connectedClientsCount,
                    ConnectedUsers = connectedUsersCount,
                    Timestamp = timestamp
                },
                itemId: null,
                userId: string.IsNullOrEmpty(userId) ? null : Guid.Parse(userId)
            );

            _logger.LogInformation("PushUpdate completed successfully: {ClientCount} clients notified", 
                connectedClientsCount);

            return Ok(new PushUpdateResponseDto
            {
                Success = true,
                Message = "Settings update notification sent successfully",
                ClientsNotified = connectedClientsCount,
                Timestamp = timestamp
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PushUpdate: Error broadcasting settings update for user {UserName}", 
                User.Identity?.Name);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                new PushUpdateResponseDto 
                { 
                    Success = false, 
                    Message = "Internal server error" 
                });
        }
    }

    /// <summary>
    /// Get historical alarm data for specified monitoring items within a date range
    /// </summary>
    /// <param name="request">Alarm history request containing start date (Unix timestamp), end date (Unix timestamp), optional item IDs, and pagination parameters</param>
    /// <returns>Paginated historical alarm events for the specified time period and items</returns>
    /// <remarks>
    /// Retrieves historical alarm events within the specified date range. If itemIds is provided,
    /// only returns alarms for those specific items. Otherwise, returns all alarms in the system.
    /// 
    /// Supports pagination through the Page and PageSize parameters. Default page size is 100 records,
    /// with a maximum of 1000 records per page. Results are ordered by time in descending order (most recent first).
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/historyalarms
    ///     {
    ///        "startDate": 1697587200,
    ///        "endDate": 1697673600,
    ///        "itemIds": ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"],
    ///        "page": 1,
    ///        "pageSize": 100
    ///     }
    ///     
    /// Leave itemIds empty or null to retrieve all alarms in the system for the date range.
    /// Dates are Unix timestamps (seconds since epoch).
    /// Page numbers are 1-based (first page is 1, not 0).
    /// </remarks>
    /// <response code="200">Returns the paginated historical alarm data with metadata (page, pageSize, totalCount, totalPages)</response>
    /// <response code="400">Validation error - invalid request format or date range</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("HistoryAlarms")]
    [ProducesResponseType(typeof(AlarmHistoryResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> HistoryAlarms([FromBody] AlarmHistoryRequestDto request)
    {
        try
        {
            _logger.LogInformation("HistoryAlarms started: User {UserId}", User.Identity?.Name);

            // Validate ModelState first
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                
                _logger.LogWarning("HistoryAlarms validation failed: {Errors}", string.Join(", ", errors));
                return BadRequest(new 
                { 
                    success = false, 
                    message = "Validation failed", 
                    errors = errors 
                });
            }

            // Extract and validate user ID
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("HistoryAlarms unauthorized access attempt");
                return Unauthorized(new { success = false, message = "Invalid or missing authentication token" });
            }

            // Validate date range
            if (request.StartDate <= 0 || request.EndDate <= 0)
            {
                _logger.LogWarning("HistoryAlarms invalid date range: StartDate={StartDate}, EndDate={EndDate}", 
                    request.StartDate, request.EndDate);
                return BadRequest(new { success = false, message = "Start date and end date must be positive Unix timestamps" });
            }

            if (request.StartDate > request.EndDate)
            {
                _logger.LogWarning("HistoryAlarms invalid date range: StartDate > EndDate");
                return BadRequest(new { success = false, message = "Start date must be before or equal to end date" });
            }

            // Set pagination defaults
            var page = request.Page ?? 1;
            var pageSize = request.PageSize ?? 100;
            pageSize = Math.Min(pageSize, 1000); // Cap at 1000

            _logger.LogDebug("Fetching alarm history: StartDate={StartDate}, EndDate={EndDate}, ItemCount={ItemCount}, Page={Page}, PageSize={PageSize}", 
                request.StartDate, request.EndDate, request.ItemIds?.Count ?? 0, page, pageSize);

            // Retrieve alarm history from Core
            var allAlarms = await Core.Alarms.HistoryAlarms(request.StartDate, request.EndDate, request.ItemIds);

            // Sort by time descending (most recent first)
            var sortedAlarms = allAlarms.OrderByDescending(a => a.Time).ToList();

            // Calculate pagination values
            var totalCount = sortedAlarms.Count;
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            // Apply pagination
            var paginatedAlarms = sortedAlarms
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            // Build response
            var response = new AlarmHistoryResponseDto
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages
            };

            foreach (var a in paginatedAlarms)
            {
                response.Data.Add(new AlarmHistoryResponseDto.AlarmHistory()
                {
                    Id = a.Id.ToString(),
                    AlarmId = a.AlarmId.ToString(),
                    ItemId = a.ItemId.ToString(),
                    Time = a.Time,
                    IsActive = a.IsActive,
                    AlarmLog = a.AlarmLog,
                });
            }

            _logger.LogInformation("HistoryAlarms completed successfully: User {UserId}, Page={Page}/{TotalPages}, AlarmCount={AlarmCount}/{TotalCount}", 
                User.Identity?.Name, page, totalPages, response.Data.Count, totalCount);

            return Ok(new { success = true, data = response, message = "Alarm history retrieved successfully" });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "HistoryAlarms argument validation failed: {Message}", ex.Message);
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "HistoryAlarms unauthorized access: {Message}", ex.Message);
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in HistoryAlarms: {Message}", ex.Message);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Add a new monitoring item to the system
    /// </summary>
    /// <param name="request">Add item request containing the new item configuration properties</param>
    /// <returns>Result indicating success or failure with the new item ID or specific error information</returns>
    /// <remarks>
    /// Creates a new monitoring item with all configuration properties such as item type, 
    /// name (English and Farsi), scaling parameters, save intervals, calculation methods,
    /// calibration settings, and save-on-change configuration.
    /// Validates that the point number is unique across all items.
    /// Creates an audit log entry for the creation.
    /// Optionally assigns the item to a parent group upon creation.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/additem
    ///     {
    ///        "itemType": "AnalogInput",
    ///        "itemName": "Temperature Sensor 1",
    ///        "itemNameFa": "دمای سنسور 1",
    ///        "pointNumber": 101,
    ///        "shouldScale": "Yes",
    ///        "normMin": 0,
    ///        "normMax": 100,
    ///        "scaleMin": -50,
    ///        "scaleMax": 150,
    ///        "saveInterval": 60,
    ///        "saveHistoricalInterval": 300,
    ///        "calculationMethod": "Average",
    ///        "numberOfSamples": 10,
    ///        "saveOnChange": "Disabled",
    ///        "saveOnChangeRange": 5.0,
    ///        "onText": "Running",
    ///        "onTextFa": "در حال اجرا",
    ///        "offText": "Stopped",
    ///        "offTextFa": "متوقف",
    ///        "unit": "°C",
    ///        "unitFa": "درجه سانتی‌گراد",
    ///        "isDisabled": false,
    ///        "isCalibrationEnabled": true,
    ///        "calibrationA": 1.0,
    ///        "calibrationB": 0.0,
    ///        "interfaceType": "Modbus",
    ///        "isEditable": true,
    ///        "parentGroupId": "550e8400-e29b-41d4-a716-446655440000"
    ///     }
    ///     
    /// </remarks>
    /// <response code="201">Monitoring item created successfully with the new item ID</response>
    /// <response code="400">Validation error - invalid request format, missing required fields, or duplicate point number</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - insufficient permissions to create items</response>
    /// <response code="404">Parent group not found - the specified parent group ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("AddItem")]
    [ProducesResponseType(typeof(AddItemResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> AddItem([FromBody] AddItemRequestDto request)
    {
        try
        {
            _logger.LogInformation("AddItem operation started");

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("AddItem: Unauthorized access attempt");
                return Unauthorized(new { success = false, message = "Authentication required" });
            }

            // Validate ModelState
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("AddItem: Validation failed: {Errors}", 
                    string.Join(", ", errors));

                return BadRequest(new AddItemResponseDto
                {
                    Success = false,
                    Message = "Validation failed",
                    Error = AddItemResponseDto.AddItemErrorType.ValidationError
                });
            }

            var userGuid = Guid.Parse(userId);

            // Check for duplicate point number
            var matchByPointNumber = await Core.Points.GetPoint(x => x.PointNumber == request.PointNumber);

            if (matchByPointNumber != null)
            {
                _logger.LogWarning("AddItem: Duplicate point number {PointNumber} found", 
                    request.PointNumber);
                return BadRequest(new AddItemResponseDto
                {
                    Success = false,
                    Message = $"Point number {request.PointNumber} is already assigned to another item",
                    Error = AddItemResponseDto.AddItemErrorType.DuplicatePointNumber
                });
            }

            // Validate parent group if provided
            if (request.ParentGroupId.HasValue)
            {
                var parentGroupExists = await _context.Groups.AnyAsync(g => g.Id == request.ParentGroupId.Value);
                if (!parentGroupExists)
                {
                    _logger.LogWarning("AddItem: Parent group {ParentGroupId} not found", 
                        request.ParentGroupId.Value);
                    return NotFound(new AddItemResponseDto
                    {
                        Success = false,
                        Message = "Parent group not found",
                        Error = AddItemResponseDto.AddItemErrorType.ParentGroupNotFound
                    });
                }
            }

            // Generate new item ID
            var newItemId = Guid.NewGuid();

            // Create the new item object
            var newItem = new MonitoringItem
            {
                Id = newItemId,
                ItemType = (Core.Libs.ItemType)request.ItemType,
                ItemName = request.ItemName,
                ItemNameFa = request.ItemNameFa,
                PointNumber = request.PointNumber,
                ShouldScale = (Core.Libs.ShouldScaleType)request.ShouldScale,
                NormMin = request.NormMin,
                NormMax = request.NormMax,
                ScaleMin = request.ScaleMin,
                ScaleMax = request.ScaleMax,
                SaveInterval = request.SaveInterval,
                SaveHistoricalInterval = request.SaveHistoricalInterval,
                CalculationMethod = (Core.Libs.ValueCalculationMethod)request.CalculationMethod,
                NumberOfSamples = request.NumberOfSamples,
                SaveOnChange = request.SaveOnChange.HasValue 
                    ? (Core.Libs.SaveOnChange)request.SaveOnChange.Value 
                    : (Core.Libs.SaveOnChange)0,
                SaveOnChangeRange = request.SaveOnChangeRange,
                OnText = request.OnText,
                OnTextFa = request.OnTextFa,
                OffText = request.OffText,
                OffTextFa = request.OffTextFa,
                Unit = request.Unit,
                UnitFa = request.UnitFa,
                IsDisabled = request.IsDisabled,
                IsCalibrationEnabled = request.IsCalibrationEnabled,
                CalibrationA = request.CalibrationA,
                CalibrationB = request.CalibrationB,
                InterfaceType = (Core.Libs.InterfaceType)request.InterfaceType,
                IsEditable = request.IsEditable,
            };

            // Add the item using Core.Points.AddPoint
            var addPointResult = await Core.Points.AddPoint(newItem);

            // Verify the item was created successfully
            var verifyItem = await Core.Points.GetPoint(newItemId);
            if (verifyItem == null)
            {
                _logger.LogError("AddItem: Failed to create new monitoring item - verification failed");
                return StatusCode(500, new AddItemResponseDto
                {
                    Success = false,
                    Message = "Failed to create monitoring item",
                    Error = AddItemResponseDto.AddItemErrorType.UnknownError
                });
            }

            // Assign to parent group if provided
            if (request.ParentGroupId.HasValue)
            {
                try
                {
                    var groupItem = new GroupItem()
                    {
                        ItemId = newItemId,
                        GroupId = request.ParentGroupId.Value,
                    };
                    await _context.GroupItems.AddAsync(groupItem);
                    await _context.SaveChangesAsync();
                    
                    _logger.LogInformation("AddItem: Item {ItemId} assigned to group {GroupId}", 
                        newItemId, request.ParentGroupId.Value);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "AddItem: Failed to assign item {ItemId} to group {GroupId}", 
                        newItemId, request.ParentGroupId.Value);
                    // Continue - item is created, just not assigned to group
                }
            }

            // Create audit log entry using AuditService
            await _auditService.LogAsync(
                LogType.AddPoint,
                new
                {
                    ItemId = newItemId,
                    ItemName = request.ItemName,
                    ItemNameFa = request.ItemNameFa,
                    ItemType = request.ItemType.ToString(),
                    PointNumber = request.PointNumber,
                    ShouldScale = request.ShouldScale.ToString(),
                    NormMin = request.NormMin,
                    NormMax = request.NormMax,
                    ScaleMin = request.ScaleMin,
                    ScaleMax = request.ScaleMax,
                    SaveInterval = request.SaveInterval,
                    SaveHistoricalInterval = request.SaveHistoricalInterval,
                    CalculationMethod = request.CalculationMethod.ToString(),
                    NumberOfSamples = request.NumberOfSamples,
                    SaveOnChange = request.SaveOnChange?.ToString(),
                    SaveOnChangeRange = request.SaveOnChangeRange,
                    OnText = request.OnText,
                    OnTextFa = request.OnTextFa,
                    OffText = request.OffText,
                    OffTextFa = request.OffTextFa,
                    Unit = request.Unit,
                    UnitFa = request.UnitFa,
                    IsDisabled = request.IsDisabled,
                    IsCalibrationEnabled = request.IsCalibrationEnabled,
                    CalibrationA = request.CalibrationA,
                    CalibrationB = request.CalibrationB,
                    InterfaceType = request.InterfaceType.ToString(),
                    IsEditable = request.IsEditable,
                    ParentGroupId = request.ParentGroupId
                },
                itemId: newItemId,
                userId: userGuid
            );

            _logger.LogInformation("AddItem: Successfully created item {ItemId} by user {UserId}", 
                newItemId, userId);

            return StatusCode(201, new AddItemResponseDto
            {
                Success = true,
                Message = "Monitoring item created successfully",
                ItemId = newItemId
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "AddItem: Validation error");
            return BadRequest(new AddItemResponseDto
            {
                Success = false,
                Message = ex.Message,
                Error = AddItemResponseDto.AddItemErrorType.ValidationError
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "AddItem: Unauthorized access attempt");
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AddItem: Error creating item: {Message}", 
                ex.Message);
            return StatusCode(500, new AddItemResponseDto
            {
                Success = false,
                Message = "Internal server error",
                Error = AddItemResponseDto.AddItemErrorType.UnknownError
            });
        }
    }

    /// <summary>
    /// Edit a monitoring item's complete configuration
    /// </summary>
    /// <param name="request">Edit item request containing the item ID and updated configuration properties</param>
    /// <returns>Result indicating success or failure with specific error information</returns>
    /// <remarks>
    /// Updates the complete configuration of an existing monitoring item including all properties
    /// such as item type, name (English and Farsi), scaling parameters, save intervals, calculation methods,
    /// calibration settings, and save-on-change configuration.
    /// Validates that the point number is unique across all items (except the current item being edited).
    /// Creates an audit log entry for the modification.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/edititem
    ///     {
    ///        "id": "550e8400-e29b-41d4-a716-446655440000",
    ///        "itemType": "AnalogInput",
    ///        "itemName": "Temperature Sensor 1",
    ///        "itemNameFa": "دمای سنسور 1",
    ///        "pointNumber": 101,
    ///        "shouldScale": "Yes",
    ///        "normMin": 0,
    ///        "normMax": 100,
    ///        "scaleMin": -50,
    ///        "scaleMax": 150,
    ///        "saveInterval": 60,
    ///        "saveHistoricalInterval": 300,
    ///        "calculationMethod": "Average",
    ///        "numberOfSamples": 10,
    ///        "saveOnChange": "Disabled",
    ///        "saveOnChangeRange": 5.0,
    ///        "onText": "Running",
    ///        "onTextFa": "در حال اجرا",
    ///        "offText": "Stopped",
    ///        "offTextFa": "متوقف",
    ///        "unit": "°C",
    ///        "unitFa": "درجه سانتی‌گراد",
    ///        "isDisabled": false,
    ///        "isCalibrationEnabled": true,
    ///        "calibrationA": 1.0,
    ///        "calibrationB": 0.0,
    ///        "interfaceType": "Modbus"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Monitoring item updated successfully with operation status</response>
    /// <response code="400">Validation error - invalid request format, missing required fields, or duplicate point number</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - insufficient permissions to edit this item</response>
    /// <response code="404">Item not found - the specified item ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("EditItem")]
    [ProducesResponseType(typeof(EditItemResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> EditItem([FromBody] EditItemRequestDto request)
    {
        try
        {
            _logger.LogInformation("EditItem operation started for item {ItemId}", request.Id);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("EditItem: Unauthorized access attempt");
                return Unauthorized(new { success = false, message = "Authentication required" });
            }

            // Validate ModelState
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("EditItem: Validation failed for item {ItemId}: {Errors}", 
                    request.Id, string.Join(", ", errors));

                return BadRequest(new EditItemResponseDto
                {
                    Success = false,
                    Message = "Validation failed",
                    Error = EditItemResponseDto.EditItemErrorType.ValidationError
                });
            }

            var userGuid = Guid.Parse(userId);

            // Check if item exists
            var existingItem = await Core.Points.GetPoint(request.Id);

            if (existingItem == null)
            {
                _logger.LogWarning("EditItem: Item {ItemId} not found", request.Id);
                return NotFound(new EditItemResponseDto
                {
                    Success = false,
                    Message = "Monitoring item not found",
                    Error = EditItemResponseDto.EditItemErrorType.ItemNotFound
                });
            }

            // Check for duplicate point number
            var matchByPointNumber = await Core.Points.GetPoint(x => x.PointNumber == request.PointNumber);

            if (matchByPointNumber != null && matchByPointNumber.Id != request.Id)
            {
                _logger.LogWarning("EditItem: Duplicate point number {PointNumber} found for another item", 
                    request.PointNumber);
                return BadRequest(new EditItemResponseDto
                {
                    Success = false,
                    Message = $"Point number {request.PointNumber} is already assigned to another item",
                    Error = EditItemResponseDto.EditItemErrorType.DuplicatePointNumber
                });
            }

            // Create the updated item object
            var updatedItem = new MonitoringItem
            {
                Id = request.Id,
                ItemType = (Core.Libs.ItemType)request.ItemType,
                ItemName = request.ItemName,
                ItemNameFa = request.ItemNameFa,
                PointNumber = request.PointNumber,
                ShouldScale = (Core.Libs.ShouldScaleType)request.ShouldScale,
                NormMin = request.NormMin,
                NormMax = request.NormMax,
                ScaleMin = request.ScaleMin,
                ScaleMax = request.ScaleMax,
                SaveInterval = request.SaveInterval,
                SaveHistoricalInterval = request.SaveHistoricalInterval,
                CalculationMethod = (Core.Libs.ValueCalculationMethod)request.CalculationMethod,
                NumberOfSamples = request.NumberOfSamples,
                SaveOnChange = request.SaveOnChange.HasValue 
                    ? (Core.Libs.SaveOnChange)request.SaveOnChange.Value 
                    : (Core.Libs.SaveOnChange)0,
                SaveOnChangeRange = request.SaveOnChangeRange,
                OnText = request.OnText,
                OnTextFa = request.OnTextFa,
                OffText = request.OffText,
                OffTextFa = request.OffTextFa,
                Unit = request.Unit,
                UnitFa = request.UnitFa,
                IsDisabled = request.IsDisabled,
                IsCalibrationEnabled = request.IsCalibrationEnabled,
                CalibrationA = request.CalibrationA,
                CalibrationB = request.CalibrationB,
                InterfaceType = (Core.Libs.InterfaceType)request.InterfaceType,
                IsEditable = request.IsEditable,
            };

            // Perform the update
            var result = await Core.Points.EditPoint(updatedItem);

            if (!result)
            {
                _logger.LogError("EditItem: Failed to update item {ItemId}", request.Id);
                return StatusCode(500, new EditItemResponseDto
                {
                    Success = false,
                    Message = "Failed to update monitoring item",
                    Error = EditItemResponseDto.EditItemErrorType.UnknownError
                });
            }

            // Create audit log entry
            // Create audit log entry using AuditService
            await _auditService.LogAsync(
                LogType.EditPoint,
                new
                {
                    ItemIdOld = existingItem.Id,
                    ItemNameOld = existingItem.ItemName,
                    ItemNameNew = request.ItemName,
                    ItemNameFaOld = existingItem.ItemNameFa,
                    ItemNameFaNew = request.ItemNameFa,
                    ItemTypeOld = existingItem.ItemType.ToString(),
                    ItemTypeNew = request.ItemType.ToString(),
                    PointNumberOld = existingItem.PointNumber,
                    PointNumberNew = request.PointNumber,
                    ShouldScaleOld = existingItem.ShouldScale.ToString(),
                    ShouldScaleNew = request.ShouldScale.ToString(),
                    NormMinOld = existingItem.NormMin,
                    NormMinNew = request.NormMin,
                    NormMaxOld = existingItem.NormMax,
                    NormMaxNew = request.NormMax,
                    ScaleMinOld = existingItem.ScaleMin,
                    ScaleMinNew = request.ScaleMin,
                    ScaleMaxOld = existingItem.ScaleMax,
                    ScaleMaxNew = request.ScaleMax,
                    SaveIntervalOld = existingItem.SaveInterval,
                    SaveIntervalNew = request.SaveInterval,
                    SaveHistoricalIntervalOld = existingItem.SaveHistoricalInterval,
                    SaveHistoricalIntervalNew = request.SaveHistoricalInterval,
                    CalculationMethodOld = existingItem.CalculationMethod.ToString(),
                    CalculationMethodNew = request.CalculationMethod.ToString(),
                    NumberOfSamplesOld = existingItem.NumberOfSamples,
                    NumberOfSamplesNew = request.NumberOfSamples,
                    SaveOnChangeOld = existingItem.SaveOnChange.ToString(),
                    SaveOnChangeNew = request.SaveOnChange.ToString(),
                    SaveOnChangeRangeOld = existingItem.SaveOnChangeRange,
                    SaveOnChangeRangeNew = request.SaveOnChangeRange,
                    OnTextOld = existingItem.OnText,
                    OnTextNew = request.OnText,
                    OnTextFaOld = existingItem.OnTextFa,
                    OnTextFaNew = request.OnTextFa,
                    OffTextOld = existingItem.OffText,
                    OffTextNew = request.OffText,
                    OffTextFaOld = existingItem.OffTextFa,
                    OffTextFaNew = request.OffTextFa,
                    UnitOld = existingItem.Unit,
                    UnitNew = request.Unit,
                    UnitFaOld = existingItem.UnitFa,
                    UnitFaNew = request.UnitFa,
                    IsDisabledOld = existingItem.IsDisabled,
                    IsDisabledNew = request.IsDisabled,
                    IsCalibrationEnabledOld = existingItem.IsCalibrationEnabled,
                    IsCalibrationEnabledNew = request.IsCalibrationEnabled,
                    CalibrationAOld = existingItem.CalibrationA,
                    CalibrationANew = request.CalibrationA,
                    CalibrationBOld = existingItem.CalibrationB,
                    CalibrationBNew = request.CalibrationB,
                    InterfaceTypeOld = existingItem.InterfaceType.ToString(),
                    InterfaceTypeNew = request.InterfaceType.ToString(),
                    IsEditableOld = existingItem.IsEditable,
                    IsEditableNew = request.IsEditable
                },
                itemId: request.Id,
                userId: userGuid
            );

            _logger.LogInformation("EditItem: Successfully updated item {ItemId} by user {UserId}", 
                request.Id, userId);

            return Ok(new EditItemResponseDto
            {
                Success = true,
                Message = "Monitoring item updated successfully"
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "EditItem: Validation error for item {ItemId}", request.Id);
            return BadRequest(new EditItemResponseDto
            {
                Success = false,
                Message = ex.Message,
                Error = EditItemResponseDto.EditItemErrorType.ValidationError
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "EditItem: Unauthorized access attempt for item {ItemId}", request.Id);
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "EditItem: Error updating item {ItemId}: {Message}", 
                request.Id, ex.Message);
            return StatusCode(500, new EditItemResponseDto
            {
                Success = false,
                Message = "Internal server error",
                Error = EditItemResponseDto.EditItemErrorType.UnknownError
            });
        }
    }

    /// <summary>
    /// Delete a monitoring item from the system
    /// </summary>
    /// <param name="request">Delete item request containing the item ID to delete</param>
    /// <returns>Result indicating success or failure of the item deletion operation</returns>
    /// <remarks>
    /// Deletes a monitoring item from the system including:
    /// - The item from the Core database (using Core.Points.DeletePoint)
    /// - Associated item permissions from DB.User.ItemPermissions
    /// - Associated group assignments from DB.User.GroupItems
    /// 
    /// This operation is irreversible and will remove all associations with the item.
    /// Historical data and alarm logs may be retained depending on system configuration.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/deleteitem
    ///     {
    ///        "id": "550e8400-e29b-41d4-a716-446655440000"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Monitoring item deleted successfully</response>
    /// <response code="400">Validation error - invalid request format or item ID</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="404">Item not found - the specified item ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("DeleteItem")]
    [ProducesResponseType(typeof(DeleteItemResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteItem([FromBody] DeleteItemRequestDto request)
    {
        try
        {
            _logger.LogInformation("DeleteItem started: ItemId={ItemId}", request.Id);

            // Validate user authentication
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("DeleteItem: Unauthorized access attempt");
                return Unauthorized(new { success = false, message = "User not authenticated" });
            }

            // Validate ModelState
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("DeleteItem: Invalid model state for ItemId={ItemId}", request.Id);
                return BadRequest(new { success = false, message = "Invalid request data" });
            }

            var userGuid = Guid.Parse(userId);
            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

            // Check if item exists in Core database
            var existingItem = await Core.Points.GetPoint(request.Id);
            if (existingItem == null)
            {
                _logger.LogWarning("DeleteItem: Item not found, ItemId={ItemId}", request.Id);
                return NotFound(new { success = false, message = "Item not found" });
            }

            // Delete from Core database using Core.Points.DeletePoint
            _logger.LogInformation("DeleteItem: Deleting item from Core database, ItemId={ItemId}", request.Id);
            var deleteResult = await Core.Points.DeletePoint(x => x.Id == request.Id);

            if (!deleteResult)
            {
                _logger.LogError("DeleteItem: Failed to delete item from Core database, ItemId={ItemId}", request.Id);
                return StatusCode(500, new { success = false, message = "Failed to delete item from Core database" });
            }

            // Delete associated ItemPermissions from DB.User database
            var itemPermissions = await _context.ItemPermissions
                .Where(x => x.ItemId == request.Id)
                .ToListAsync();

            if (itemPermissions.Any())
            {
                _logger.LogInformation("DeleteItem: Removing {Count} item permissions for ItemId={ItemId}", 
                    itemPermissions.Count, request.Id);
                _context.ItemPermissions.RemoveRange(itemPermissions);
            }

            // Delete associated GroupItems from DB.User database
            var groupItems = await _context.GroupItems
                .Where(x => x.ItemId == request.Id)
                .ToListAsync();

            if (groupItems.Any())
            {
                _logger.LogInformation("DeleteItem: Removing {Count} group items for ItemId={ItemId}", 
                    groupItems.Count, request.Id);
                _context.GroupItems.RemoveRange(groupItems);
            }

            // Save changes to DB.User database
            await _context.SaveChangesAsync();

            // Create audit log entry using AuditService
            await _auditService.LogAsync(
                LogType.DeletePoint,
                new
                {
                    Id = existingItem.Id,
                    ItemType = existingItem.ItemType.ToString(),
                    ItemName = existingItem.ItemName,
                    ItemNameFa = existingItem.ItemNameFa,
                    PointNumber = existingItem.PointNumber,
                    DeletedPermissionsCount = itemPermissions.Count,
                    DeletedGroupAssignmentsCount = groupItems.Count
                },
                itemId: request.Id,
                userId: userGuid
            );

            _logger.LogInformation("DeleteItem completed successfully: ItemId={ItemId}, User={UserId}", 
                request.Id, userId);

            return Ok(new DeleteItemResponseDto
            {
                IsSuccess = true,
                Message = "Item deleted successfully"
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "DeleteItem: Validation failed for ItemId={ItemId}", request.Id);
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "DeleteItem: Resource not found for ItemId={ItemId}", request.Id);
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DeleteItem: Error deleting item, ItemId={ItemId}, Error={Message}", 
                request.Id, ex.Message);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Retrieve audit log entries for system activities within a date range
    /// </summary>
    /// <param name="request">Audit log request containing start date (Unix timestamp), end date (Unix timestamp), optional item ID filter, and optional pagination parameters</param>
    /// <returns>Paginated list of audit log entries showing user actions and system events with user details</returns>
    /// <remarks>
    /// Retrieves audit log entries within the specified date range. If itemId is provided,
    /// only returns logs for that specific item. Otherwise, returns logs for all items the user has access to.
    /// 
    /// **Access Control:**
    /// - Admin users can see all audit logs in the system
    /// - Regular users can only see audit logs for items they have permission to access
    /// - Logs without associated items (system-level logs) are visible to all authenticated users
    /// 
    /// **Pagination:**
    /// - Default page size is 50 records
    /// - Maximum page size is 500 records
    /// - Page numbers are 1-based (first page is 1, not 0)
    /// - Response includes total count and total pages for navigation
    /// 
    /// Sample request with pagination:
    /// 
    ///     POST /api/monitoring/auditlog
    ///     {
    ///        "startDate": 1697587200,
    ///        "endDate": 1697673600,
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440001",
    ///        "page": 1,
    ///        "pageSize": 50
    ///     }
    ///     
    /// Leave itemId empty or null to retrieve all accessible audit logs for the date range.
    /// Leave page and pageSize empty to use defaults (page 1, 50 records per page).
    /// Dates are Unix timestamps (seconds since epoch).
    /// Results are ordered by time descending (most recent first).
    /// </remarks>
    /// <response code="200">Returns the paginated audit log entries with success status and pagination metadata</response>
    /// <response code="400">Validation error - invalid request format, invalid GUID, date range error, or pagination parameters</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - user does not have permission to access the requested item</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("AuditLog")]
    [ProducesResponseType(typeof(AuditLogResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> AuditLog([FromBody] AuditLogRequestDto request)
    {
        try
        {
            _logger.LogInformation("AuditLog endpoint called: User {UserId}", User.Identity?.Name);

            // Validate ModelState first
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                
                _logger.LogWarning("AuditLog validation failed: {Errors}", string.Join(", ", errors));
                return BadRequest(new 
                { 
                    success = false, 
                    message = "Validation failed", 
                    errors = errors 
                });
            }

            // Extract and validate user ID
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("AuditLog unauthorized access attempt (no user id)");
                return Unauthorized(new { success = false, message = "Invalid or missing authentication token" });
            }

            // Get user information to check admin status
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                _logger.LogWarning("AuditLog user not found: {UserId}", userId);
                return Unauthorized(new { success = false, message = "User not found" });
            }

            var isAdmin = user.UserName?.ToLower() == "admin";
            var userGuid = Guid.Parse(userId);

            // Validate date range
            if (request.StartDate <= 0 || request.EndDate <= 0)
            {
                _logger.LogWarning("AuditLog invalid date range: StartDate={StartDate}, EndDate={EndDate}", 
                    request.StartDate, request.EndDate);
                return BadRequest(new { success = false, message = "Start date and end date must be positive Unix timestamps" });
            }

            if (request.StartDate > request.EndDate)
            {
                _logger.LogWarning("AuditLog invalid date range: StartDate > EndDate");
                return BadRequest(new { success = false, message = "Start date must be before or equal to end date" });
            }

            // Validate ItemId format if provided
            Guid? itemIdGuid = null;
            if (!string.IsNullOrEmpty(request.ItemId))
            {
                if (!Guid.TryParse(request.ItemId, out var parsedGuid))
                {
                    _logger.LogWarning("AuditLog invalid ItemId format: {ItemId}", request.ItemId);
                    return BadRequest(new { success = false, message = "Invalid ItemId format. Must be a valid GUID." });
                }
                itemIdGuid = parsedGuid;
            }

            // For non-admin users, get the list of items they have permission to access
            List<Guid> accessibleItemIds = new List<Guid>();
            if (!isAdmin)
            {
                var permissions = await _context.ItemPermissions
                    .Where(x => x.UserId == userGuid)
                    .Select(x => x.ItemId)
                    .ToListAsync();
                
                accessibleItemIds = permissions;

                // If user requested a specific item, check if they have access to it
                if (itemIdGuid.HasValue && !accessibleItemIds.Contains(itemIdGuid.Value))
                {
                    _logger.LogWarning("AuditLog forbidden access attempt: User {UserId} requested item {ItemId} without permission",
                        userId, itemIdGuid.Value);
                    return StatusCode(StatusCodes.Status403Forbidden, 
                        new { success = false, message = "You do not have permission to access logs for this item" });
                }

                _logger.LogDebug("Non-admin user {UserId} has access to {Count} items", userId, accessibleItemIds.Count);
            }

            _logger.LogDebug("Fetching audit logs: StartDate={StartDate}, EndDate={EndDate}, ItemId={ItemId}, IsAdmin={IsAdmin}", 
                request.StartDate, request.EndDate, request.ItemId ?? "ALL", isAdmin);

            // Set pagination defaults
            var page = request.Page ?? 1;
            var pageSize = request.PageSize ?? 50;
            pageSize = Math.Min(pageSize, 500); // Cap at 500

            // Build base query
            IQueryable<AuditLog> query = _context.AuditLogs
                .Where(x => x.Time >= request.StartDate && x.Time <= request.EndDate);

            // Apply item filtering
            if (itemIdGuid.HasValue)
            {
                // Specific item requested
                query = query.Where(x => x.ItemId == itemIdGuid.Value);
            }
            else if (!isAdmin)
            {
                // Non-admin user: filter to only accessible items OR logs without an item association (system logs)
                query = query.Where(x => x.ItemId == null || accessibleItemIds.Contains(x.ItemId.Value));
            }
            // Admin users: no filtering, see all logs

            // Get total count before pagination
            var totalCount = await query.CountAsync();

            // Apply pagination
            var logs = await query
                .OrderByDescending(x => x.Time)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Get all unique user IDs from logs to avoid N+1 query problem
            var userIds = logs
                .Where(l => l.UserId != null)
                .Select(l => l.UserId.ToString())
                .Distinct()
                .ToList();

            // Fetch all users in a single query
            var users = await _context.Users
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.UserName);

            // Build response
            var response = new AuditLogResponseDto
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };

            foreach (var d in logs)
            {
                string userName = "";
                if (d.UserId != null)
                {
                    var userIdString = d.UserId.ToString();
                    if (userIdString != null)
                    {
                        users.TryGetValue(userIdString, out var foundUserName);
                        userName = foundUserName ?? "";
                    }
                }

                response.Data.Add(new AuditLogResponseDto.DataDto()
                {
                    Id = d.Id,
                    IsUser = d.IsUser,
                    UserId = d.UserId,
                    UserName = userName,
                    ItemId = d.ItemId,
                    ActionType = d.ActionType,
                    IpAddress = d.IpAddress,
                    LogValue = d.LogValue,
                    Time = d.Time,
                });
            }

            _logger.LogInformation("AuditLog completed successfully: User {UserId}, IsAdmin={IsAdmin}, Page={Page}/{TotalPages}, LogCount={LogCount}/{TotalCount}", 
                User.Identity?.Name, isAdmin, page, response.TotalPages, response.Data.Count, totalCount);

            return Ok(new { success = true, data = response, message = "Audit logs retrieved successfully" });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "AuditLog validation error: {Message}", ex.Message);
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "AuditLog unauthorized access: {Message}", ex.Message);
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in AuditLog endpoint for user {UserId}: {Message}", 
                User.FindFirstValue(ClaimTypes.NameIdentifier), ex.Message);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Edit the configuration of an existing alarm
    /// </summary>
    /// <param name="request">Edit alarm request containing alarm ID and updated configuration properties</param>
    /// <returns>Result indicating success or failure of the alarm edit operation with detailed status</returns>
    /// <remarks>
    /// Updates the complete configuration of an existing alarm including:
    /// - Enabled/disabled state
    /// - Alarm delay (time before triggering after condition is met)
    /// - Custom alarm message (English and Farsi)
    /// - Comparison values (Value1, Value2) for alarm conditions
    /// - Acknowledgment timeout
    /// - Alarm type (Comparative or Timeout)
    /// - Alarm priority (Critical, High, Medium, Low)
    /// - Comparison type (Equal, NotEqual, Greater, etc.)
    /// 
    /// **Alarm Types:**
    /// - Comparative (1): For digital and analog values using comparison logic with thresholds (Value1/Value2) and comparison operators
    /// - Timeout (2): Time-based alarm that triggers after a specified timeout duration without receiving data updates
    /// 
    /// **Comparison Types:** (Used only with Comparative alarm type)
    /// - Equal (0): Value equals Value1
    /// - NotEqual (1): Value does not equal Value1
    /// - Greater (2): Value is greater than Value1
    /// - GreaterOrEqual (3): Value is greater than or equal to Value1
    /// - Less (4): Value is less than Value1
    /// - LessOrEqual (5): Value is less than or equal to Value1
    /// - Between (6): Value is between Value1 and Value2 (inclusive)
    /// - OutOfRange (7): Value is outside the range Value1 to Value2
    /// 
    /// **Priority Levels:**
    /// - Critical (0): Highest priority - immediate attention required
    /// - High (1): High priority - prompt response needed
    /// - Medium (2): Medium priority - normal response time
    /// - Low (3): Low priority - informational
    /// 
    /// Validates:
    /// - The alarm exists in the system
    /// - The associated monitoring item exists
    /// - All input parameters are within valid ranges
    /// 
    /// Creates an audit log entry with before/after values for all changed properties.
    /// 
    /// Sample request for a critical high-temperature alarm (Comparative with Greater Than):
    /// 
    ///     POST /api/monitoring/editalarm
    ///     {
    ///        "id": "550e8400-e29b-41d4-a716-446655440000",
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440001",
    ///        "isDisabled": false,
    ///        "alarmDelay": 5,
    ///        "message": "Temperature exceeded maximum threshold",
    ///        "messageFa": "حداکثر آستانه دما تجاوز شده است",
    ///        "value1": "75.5",
    ///        "value2": "100.0",
    ///        "timeout": null,
    ///        "alarmType": 1,
    ///        "alarmPriority": 0,
    ///        "compareType": 2
    ///     }
    ///     
    /// Sample request for a timeout-based alarm (AlarmType 2 - triggers when no data received):
    /// 
    ///     POST /api/monitoring/editalarm
    ///     {
    ///        "id": "550e8400-e29b-41d4-a716-446655440000",
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440001",
    ///        "isDisabled": false,
    ///        "alarmDelay": 0,
    ///        "message": "Communication timeout - device not responding",
    ///        "messageFa": "وقفه ارتباطی - دستگاه پاسخ نمی‌دهد",
    ///        "value1": null,
    ///        "value2": null,
    ///        "timeout": 300,
    ///        "alarmType": 2,
    ///        "alarmPriority": 1,
    ///        "compareType": 0
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Alarm configuration updated successfully</response>
    /// <response code="400">Validation error - invalid request format, missing required fields, or values out of range</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - insufficient permissions to edit this alarm</response>
    /// <response code="404">Alarm or item not found - the specified alarm or item ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("EditAlarm")]
    [ProducesResponseType(typeof(EditAlarmResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> EditAlarm([FromBody] EditAlarmRequestDto request)
    {
        try
        {
            _logger.LogInformation("EditAlarm started: AlarmId={AlarmId}, ItemId={ItemId}", 
                request.Id, request.ItemId);

            // Validate ModelState first
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                
                _logger.LogWarning("EditAlarm: Validation failed for AlarmId={AlarmId}, Errors={Errors}", 
                    request.Id, string.Join(", ", errors));
                
                return BadRequest(new EditAlarmResponseDto
                {
                    Success = false,
                    Message = "Validation failed: " + string.Join("; ", errors),
                    Error = EditAlarmResponseDto.EditAlarmErrorType.ValidationError
                });
            }

            // Validate user authentication
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("EditAlarm: Unauthorized access attempt for AlarmId={AlarmId}", request.Id);
                return Unauthorized(new EditAlarmResponseDto
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var userGuid = Guid.Parse(userId);

            // Check if item exists
            _logger.LogDebug("EditAlarm: Checking if item exists, ItemId={ItemId}", request.ItemId);
            var point = await Core.Points.GetPoint(request.ItemId);
            if (point == null)
            {
                _logger.LogWarning("EditAlarm: Item not found, ItemId={ItemId}", request.ItemId);
                return NotFound(new EditAlarmResponseDto
                {
                    Success = false,
                    Message = "Monitoring item not found",
                    Error = EditAlarmResponseDto.EditAlarmErrorType.ItemNotFound
                });
            }

            // Check if alarm exists
            _logger.LogDebug("EditAlarm: Checking if alarm exists, AlarmId={AlarmId}", request.Id);
            var alarm = await Core.Alarms.GetAlarm(request.Id);
            if (alarm == null)
            {
                _logger.LogWarning("EditAlarm: Alarm not found, AlarmId={AlarmId}", request.Id);
                return NotFound(new EditAlarmResponseDto
                {
                    Success = false,
                    Message = "Alarm not found",
                    Error = EditAlarmResponseDto.EditAlarmErrorType.AlarmNotFound
                });
            }

            // Create audit log with before/after values
            var logValue = new EditAlarmLog()
            {
                IsDisabledOld = alarm.IsDisabled,
                IsDisabledNew = request.IsDisabled,
                AlarmDelayOld = alarm.AlarmDelay,
                AlarmDelayNew = request.AlarmDelay,
                MessageOld = alarm.Message,
                MessageNew = request.Message,
                MessageFaOld = alarm.MessageFa,
                MessageFaNew = request.MessageFa,
                Value1Old = alarm.Value1,
                Value1New = request.Value1,
                Value2Old = alarm.Value2,
                Value2New = request.Value2,
                TimeoutOld = alarm.Timeout,
                TimeoutNew = request.Timeout,
                AlarmTypeOld = (Share.Libs.AlarmType)alarm.AlarmType,
                AlarmTypeNew = request.AlarmType,
                AlarmPriorityOld = (Share.Libs.AlarmPriority)alarm.AlarmPriority,
                AlarmPriorityNew = request.AlarmPriority,
                CompareTypeOld = (Share.Libs.CompareType)alarm.CompareType,
                CompareTypeNew = request.CompareType,
            };

            // Update alarm properties
            alarm.IsDisabled = request.IsDisabled;
            alarm.AlarmDelay = request.AlarmDelay;
            alarm.Message = request.Message;
            alarm.MessageFa = request.MessageFa;
            alarm.Value1 = request.Value1;
            alarm.Value2 = request.Value2;
            alarm.Timeout = request.Timeout;
            alarm.AlarmType = (Core.Libs.AlarmType)request.AlarmType;
            alarm.AlarmPriority = (Core.Libs.AlarmPriority)request.AlarmPriority;
            alarm.CompareType = (Core.Libs.CompareType)request.CompareType;

            _logger.LogInformation("EditAlarm: Updating alarm in database, AlarmId={AlarmId}", request.Id);
            var result = await Core.Alarms.EditAlarm(alarm);

            if (!result)
            {
                _logger.LogError("EditAlarm: Database update failed for AlarmId={AlarmId}", request.Id);
                return StatusCode(500, new EditAlarmResponseDto
                {
                    Success = false,
                    Message = "Failed to update alarm in database",
                    Error = EditAlarmResponseDto.EditAlarmErrorType.DatabaseError
                });
            }

            // Create audit log entry
            var logValueJson = JsonConvert.SerializeObject(logValue, Formatting.Indented);
            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();
            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();

            await _context.AuditLogs.AddAsync(new AuditLog()
            {
                IsUser = true,
                UserId = userGuid,
                ItemId = request.ItemId,
                ActionType = LogType.EditAlarm,
                IpAddress = ipAddress,
                LogValue = logValueJson,
                Time = epochTime,
            });
            await _context.SaveChangesAsync();

            _logger.LogInformation("EditAlarm completed successfully: AlarmId={AlarmId}, User={UserId}", 
                request.Id, userId);

            return Ok(new EditAlarmResponseDto
            {
                Success = true,
                Message = "Alarm configuration updated successfully"
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "EditAlarm: Validation error for AlarmId={AlarmId}", request.Id);
            return BadRequest(new EditAlarmResponseDto
            {
                Success = false,
                Message = ex.Message,
                Error = EditAlarmResponseDto.EditAlarmErrorType.ValidationError
            });
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "EditAlarm: Resource not found for AlarmId={AlarmId}", request.Id);
            return NotFound(new EditAlarmResponseDto
            {
                Success = false,
                Message = ex.Message,
                Error = EditAlarmResponseDto.EditAlarmErrorType.AlarmNotFound
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "EditAlarm: Unauthorized access attempt for AlarmId={AlarmId}", request.Id);
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "EditAlarm: Error updating alarm, AlarmId={AlarmId}, Error={Message}", 
                request.Id, ex.Message);
            return StatusCode(500, new EditAlarmResponseDto
            {
                Success = false,
                Message = "Internal server error",
                Error = EditAlarmResponseDto.EditAlarmErrorType.UnknownError
            });
        }
    }

    /// <summary>
    /// Create a new monitoring group for organizing monitoring items
    /// </summary>
    /// <param name="request">Add group request containing group name (English and optional Farsi) and optional parent ID</param>
    /// <returns>Result indicating success or failure of group creation with the new group ID</returns>
    /// <remarks>
    /// Creates a new monitoring group in the system. Groups can be organized hierarchically by specifying a parent group ID.
    /// Group names should be unique within the same parent context and descriptive for easy identification.
    /// Supports bilingual naming with both English and Farsi names.
    /// 
    /// Sample request with Farsi name:
    /// 
    ///     POST /api/monitoring/addgroup
    ///     {
    ///        "name": "Building A - HVAC System",
    ///        "nameFa": "ساختمان الف - سیستم تهویه مطبوع",
    ///        "parentId": "550e8400-e29b-41d4-a716-446655440000"
    ///     }
    ///     
    /// For a root-level group without Farsi name:
    /// 
    ///     POST /api/monitoring/addgroup
    ///     {
    ///        "name": "Main Building"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Monitoring group created successfully</response>
    /// <response code="400">Validation error - invalid request format, empty group name, or duplicate group name</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="404">Parent group not found - the specified parent group ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("AddGroup")]
    [ProducesResponseType(typeof(AddGroupResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AddGroupResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(AddGroupResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(AddGroupResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> AddGroup([FromBody] AddGroupRequestDto request)
    {
        try
        {
            _logger.LogInformation("AddGroup endpoint called: User {UserId}, GroupName {GroupName}", 
                User.Identity?.Name, request.Name);

            // Validate ModelState first
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                
                _logger.LogWarning("AddGroup validation failed: {Errors}", string.Join(", ", errors));
                return BadRequest(new AddGroupResponseDto
                { 
                    Success = false, 
                    Message = "Validation failed: " + string.Join(", ", errors),
                    Error = AddGroupResponseDto.AddGroupErrorType.ValidationError
                });
            }

            // Extract and validate user ID
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("AddGroup unauthorized access attempt (no user id)");
                return Unauthorized(new { success = false, message = "Invalid or missing authentication token" });
            }

            var userGuid = Guid.Parse(userId);

            // Validate group name is not empty or whitespace
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                _logger.LogWarning("AddGroup: Empty group name provided by user {UserId}", userId);
                return BadRequest(new AddGroupResponseDto
                {
                    Success = false,
                    Message = "Group name cannot be empty or whitespace",
                    Error = AddGroupResponseDto.AddGroupErrorType.ValidationError
                });
            }

            // Validate NameFa if provided
            if (!string.IsNullOrWhiteSpace(request.NameFa) && request.NameFa.Length > 100)
            {
                _logger.LogWarning("AddGroup: NameFa exceeds maximum length for user {UserId}", userId);
                return BadRequest(new AddGroupResponseDto
                {
                    Success = false,
                    Message = "Group name (Farsi) must not exceed 100 characters",
                    Error = AddGroupResponseDto.AddGroupErrorType.ValidationError
                });
            }

            // Check if parent group exists if ParentId is provided
            if (request.ParentId.HasValue)
            {
                var parentGroup = await _context.Groups.FirstOrDefaultAsync(g => g.Id == request.ParentId.Value);
                if (parentGroup == null)
                {
                    _logger.LogWarning("AddGroup: Parent group {ParentId} not found for user {UserId}", 
                        request.ParentId.Value, userId);
                    return NotFound(new AddGroupResponseDto
                    {
                        Success = false,
                        Message = $"Parent group with ID {request.ParentId.Value} not found",
                        Error = AddGroupResponseDto.AddGroupErrorType.ParentGroupNotFound
                    });
                }
            }

            // Check for duplicate group name (optional - depending on business requirements)
            var existingGroup = await _context.Groups
                .FirstOrDefaultAsync(g => g.Name.ToLower() == request.Name.ToLower() && g.ParentId == request.ParentId);
            
            if (existingGroup != null)
            {
                _logger.LogWarning("AddGroup: Duplicate group name '{GroupName}' for user {UserId}", 
                    request.Name, userId);
                return BadRequest(new AddGroupResponseDto
                {
                    Success = false,
                    Message = $"A group with the name '{request.Name}' already exists in this location",
                    Error = AddGroupResponseDto.AddGroupErrorType.DuplicateGroupName
                });
            }

            // Create the new group
            var newGroup = new Group()
            {
                Name = request.Name,
                NameFa = request.NameFa,
                ParentId = request.ParentId,
            };

            await _context.Groups.AddAsync(newGroup);
            await _context.SaveChangesAsync();

            // Create audit log entry
            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();
            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

            var auditLogData = new
            {
                GroupId = newGroup.Id,
                GroupName = newGroup.Name,
                GroupNameFa = newGroup.NameFa,
                ParentId = newGroup.ParentId,
                CreatedBy = userId
            };

            var logValueJson = JsonConvert.SerializeObject(auditLogData, Formatting.Indented);

            await _context.AuditLogs.AddAsync(new AuditLog
            {
                IsUser = true,
                UserId = userGuid,
                ItemId = null,
                ActionType = LogType.AddGroup,
                IpAddress = ipAddress,
                LogValue = logValueJson,
                Time = epochTime,
            });
            await _context.SaveChangesAsync();

            _logger.LogInformation("AddGroup: Successfully created group {GroupId} with name '{GroupName}' (NameFa: '{NameFa}') by user {UserId}", 
                newGroup.Id, newGroup.Name, newGroup.NameFa ?? "N/A", userId);

            return Ok(new AddGroupResponseDto
            {
                Success = true,
                Message = "Monitoring group created successfully",
                GroupId = newGroup.Id
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "AddGroup: Validation error - {Message}", ex.Message);
            return BadRequest(new AddGroupResponseDto
            {
                Success = false,
                Message = ex.Message,
                Error = AddGroupResponseDto.AddGroupErrorType.ValidationError
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "AddGroup: Unauthorized access attempt");
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AddGroup: Error creating group '{GroupName}': {Message}", 
                request.Name, ex.Message);
            return StatusCode(StatusCodes.Status500InternalServerError, new AddGroupResponseDto
            {
                Success = false,
                Message = "Internal server error",
                Error = AddGroupResponseDto.AddGroupErrorType.UnknownError
            });
        }
    }

    /// <summary>
    /// Edit an existing monitoring group's name and Farsi name
    /// </summary>
    /// <param name="request">Edit group request containing group ID and updated name properties</param>
    /// <returns>Result indicating success or failure of group update operation</returns>
    /// <remarks>
    /// Updates the name and/or Farsi name of an existing monitoring group.
    /// This endpoint does NOT change the parent-child hierarchy; use the MoveGroup endpoint to move groups.
    /// 
    /// Validates:
    /// - The group exists
    /// - The new name is not empty or whitespace
    /// - The new name is not a duplicate within the same parent location
    /// - Name length constraints are met (1-100 characters)
    /// 
    /// Sample request to update both English and Farsi names:
    /// 
    ///     POST /api/monitoring/editgroup
    ///     {
    ///        "id": "550e8400-e29b-41d4-a716-446655440000",
    ///        "name": "Building A - HVAC System",
    ///        "nameFa": "ساختمان الف - سیستم تهویه مطبوع"
    ///     }
    ///     
    /// Sample request to update only the English name:
    /// 
    ///     POST /api/monitoring/editgroup
    ///     {
    ///        "id": "550e8400-e29b-41d4-a716-446655440000",
    ///        "name": "Building A - Updated Name"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Monitoring group updated successfully</response>
    /// <response code="400">Validation error - invalid request format, empty group name, duplicate group name, or invalid GUID</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - insufficient permissions to edit this group</response>
    /// <response code="404">Group not found - the specified group ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("EditGroup")]
    [ProducesResponseType(typeof(EditGroupResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(EditGroupResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(EditGroupResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(EditGroupResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> EditGroup([FromBody] EditGroupRequestDto request)
    {
        try
        {
            _logger.LogInformation("EditGroup endpoint called: User {UserId}, GroupId {GroupId}, NewName {GroupName}", 
                User.Identity?.Name, request.Id, request.Name);

            // Validate ModelState first
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                
                _logger.LogWarning("EditGroup validation failed: {Errors}", string.Join(", ", errors));
                return BadRequest(new EditGroupResponseDto
                { 
                    Success = false, 
                    Message = "Validation failed: " + string.Join(", ", errors),
                    Error = EditGroupResponseDto.EditGroupErrorType.ValidationError
                });
            }

            // Extract and validate user ID
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("EditGroup unauthorized access attempt (no user id)");
                return Unauthorized(new { success = false, message = "Invalid or missing authentication token" });
            }

            var userGuid = Guid.Parse(userId);

            // Validate group name is not empty or whitespace
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                _logger.LogWarning("EditGroup: Empty group name provided by user {UserId}", userId);
                return BadRequest(new EditGroupResponseDto
                {
                    Success = false,
                    Message = "Group name cannot be empty or whitespace",
                    Error = EditGroupResponseDto.EditGroupErrorType.ValidationError
                });
            }

            // Validate NameFa if provided
            if (!string.IsNullOrWhiteSpace(request.NameFa) && request.NameFa.Length > 100)
            {
                _logger.LogWarning("EditGroup: NameFa exceeds maximum length for user {UserId}", userId);
                return BadRequest(new EditGroupResponseDto
                {
                    Success = false,
                    Message = "Group name (Farsi) must not exceed 100 characters",
                    Error = EditGroupResponseDto.EditGroupErrorType.ValidationError
                });
            }

            // Find the existing group
            var existingGroup = await _context.Groups.FirstOrDefaultAsync(g => g.Id == request.Id);
            
            if (existingGroup == null)
            {
                _logger.LogWarning("EditGroup: Group {GroupId} not found for user {UserId}", 
                    request.Id, userId);
                return NotFound(new EditGroupResponseDto
                {
                    Success = false,
                    Message = $"Group with ID {request.Id} not found",
                    Error = EditGroupResponseDto.EditGroupErrorType.GroupNotFound
                });
            }

            // Check for duplicate group name (excluding the current group)
            var duplicateGroup = await _context.Groups
                .FirstOrDefaultAsync(g => 
                    g.Id != request.Id && 
                    g.Name.ToLower() == request.Name.ToLower() && 
                    g.ParentId == existingGroup.ParentId);
            
            if (duplicateGroup != null)
            {
                _logger.LogWarning("EditGroup: Duplicate group name '{GroupName}' in same parent location for user {UserId}", 
                    request.Name, userId);
                return BadRequest(new EditGroupResponseDto
                {
                    Success = false,
                    Message = $"A group with the name '{request.Name}' already exists in this location",
                    Error = EditGroupResponseDto.EditGroupErrorType.DuplicateGroupName
                });
            }

            // Store old values for audit log
            var oldName = existingGroup.Name;
            var oldNameFa = existingGroup.NameFa;

            // Update the group
            existingGroup.Name = request.Name;
            existingGroup.NameFa = request.NameFa;

            _context.Groups.Update(existingGroup);
            await _context.SaveChangesAsync();

            // Create audit log entry
            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();
            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

            var auditLogData = new
            {
                GroupId = existingGroup.Id,
                OldName = oldName,
                NewName = existingGroup.Name,
                OldNameFa = oldNameFa,
                NewNameFa = existingGroup.NameFa,
                ModifiedBy = userId
            };

            var logValueJson = JsonConvert.SerializeObject(auditLogData, Formatting.Indented);

            await _context.AuditLogs.AddAsync(new AuditLog
            {
                IsUser = true,
                UserId = userGuid,
                ItemId = null,
                ActionType = LogType.EditGroup,
                IpAddress = ipAddress,
                LogValue = logValueJson,
                Time = epochTime,
            });
            await _context.SaveChangesAsync();

            _logger.LogInformation("EditGroup: Successfully updated group {GroupId} - Name: '{OldName}' -> '{NewName}', NameFa: '{OldNameFa}' -> '{NewNameFa}' by user {UserId}", 
                existingGroup.Id, oldName, existingGroup.Name, oldNameFa ?? "N/A", existingGroup.NameFa ?? "N/A", userId);

            return Ok(new EditGroupResponseDto
            {
                Success = true,
                Message = "Monitoring group updated successfully"
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "EditGroup: Validation error - {Message}", ex.Message);
            return BadRequest(new EditGroupResponseDto
            {
                Success = false,
                Message = ex.Message,
                Error = EditGroupResponseDto.EditGroupErrorType.ValidationError
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "EditGroup: Unauthorized access attempt");
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "EditGroup: Error updating group {GroupId}: {Message}", 
                request.Id, ex.Message);
            return StatusCode(StatusCodes.Status500InternalServerError, new EditGroupResponseDto
            {
                Success = false,
                Message = "Internal server error",
                Error = EditGroupResponseDto.EditGroupErrorType.UnknownError
            });
        }
    }

    /// <summary>
    /// Save user permissions for accessing monitoring items
    /// </summary>
    /// <param name="request">Save permissions request containing user ID and list of item permissions</param>
    /// <returns>Result indicating success or failure of permission saving operation</returns>
    /// <remarks>
    /// **Admin-only endpoint** that updates the user's item permissions by replacing all existing permissions with the new set.
    /// Groups are accessible to all users, with client-side filtering based on item access.
    /// 
    /// **Behavior:**
    /// - Removes all existing item permissions for the specified user
    /// - Adds new permissions based on the provided list
    /// - Updates the user's version identifier to trigger client cache invalidation
    /// - Creates an audit log entry for compliance tracking
    /// 
    /// **Item Permissions:**
    /// - Each item ID must be a valid GUID format
    /// - Duplicate item IDs are automatically deduplicated
    /// - Empty list is allowed to revoke all permissions for the user
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/savepermissions
    ///     {
    ///        "userId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "itemPermissions": ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]
    ///     }
    ///
    /// </remarks>
    /// <response code="200">Permissions saved successfully with count of applied permissions</response>
    /// <response code="400">Validation error - invalid request format, invalid GUID, or user not found</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - Admin role required</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("SavePermissions")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(SavePermissionsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> SavePermissions([FromBody] SavePermissionsRequestDto request)
    {
        try
        {
            _logger.LogInformation("SavePermissions operation started for user {TargetUserId}", request.UserId);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("SavePermissions: Unauthorized access attempt");
                return Unauthorized(new { success = false, message = "Authentication required" });
            }

            // Validate ModelState
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("SavePermissions: Validation failed for user {TargetUserId}: {Errors}", 
                    request.UserId, string.Join(", ", errors));

                return BadRequest(new 
                { 
                    success = false, 
                    message = "Validation failed", 
                    errors = errors 
                });
            }

            // Validate UserId is a valid GUID
            if (!Guid.TryParse(request.UserId, out var targetUserGuid))
            {
                _logger.LogWarning("SavePermissions: Invalid UserId format {UserId}", request.UserId);
                return BadRequest(new SavePermissionsResponseDto
                {
                    Success = false,
                    Message = "Invalid user ID format. Must be a valid GUID."
                });
            }

            var targetUser = await _userManager.FindByIdAsync(request.UserId);
            
            if (targetUser == null)
            {
                _logger.LogWarning("SavePermissions: User not found {UserId}", request.UserId);
                return BadRequest(new SavePermissionsResponseDto
                {
                    Success = false,
                    Message = "User not found"
                });
            }

            // Validate all item IDs are valid GUIDs
            var invalidItemIds = new List<string>();
            var validItemGuids = new List<Guid>();

            foreach (var itemId in request.ItemPermissions)
            {
                if (Guid.TryParse(itemId, out var itemGuid))
                {
                    validItemGuids.Add(itemGuid);
                }
                else
                {
                    invalidItemIds.Add(itemId);
                }
            }

            if (invalidItemIds.Any())
            {
                _logger.LogWarning("SavePermissions: Invalid item ID formats {ItemIds}", 
                    string.Join(", ", invalidItemIds));
                return BadRequest(new SavePermissionsResponseDto
                {
                    Success = false,
                    Message = $"Invalid item ID formats: {string.Join(", ", invalidItemIds)}"
                });
            }

            // Deduplicate item IDs
            validItemGuids = validItemGuids.Distinct().ToList();

            // Remove existing item permissions for the user
            var itemsToDelete = await _context.ItemPermissions
                .Where(x => x.UserId == targetUserGuid)
                .ToListAsync();

            _logger.LogInformation("SavePermissions: Removing {Count} existing permissions for user {UserId}", 
                itemsToDelete.Count, request.UserId);

            _context.ItemPermissions.RemoveRange(itemsToDelete);

            // Add new item permissions
            List<ItemPermission> itemPermissions = new();

            foreach (var itemGuid in validItemGuids)
            {
                itemPermissions.Add(new ItemPermission()
                {
                    UserId = targetUserGuid,
                    ItemId = itemGuid,
                });
            }

            if (itemPermissions.Any())
            {
                await _context.ItemPermissions.AddRangeAsync(itemPermissions);
                _logger.LogInformation("SavePermissions: Adding {Count} new permissions for user {UserId}", 
                    itemPermissions.Count, request.UserId);
            }
            else
            {
                _logger.LogInformation("SavePermissions: No permissions to add for user {UserId} (all revoked)", 
                    request.UserId);
            }

            // Update or create user version to trigger client cache invalidation
            var userVersion = await _context.UserVersions.FirstOrDefaultAsync(x => x.UserId == targetUserGuid);

            if (userVersion == null)
            {
                userVersion = new UserVersion()
                {
                    UserId = targetUserGuid,
                    Version = Guid.NewGuid().ToString(),
                };

                await _context.UserVersions.AddAsync(userVersion);
                _logger.LogInformation("SavePermissions: Created new user version for {UserId}", request.UserId);
            }
            else
            {
                userVersion.Version = Guid.NewGuid().ToString();
                _logger.LogInformation("SavePermissions: Updated user version for {UserId} to {Version}", 
                    request.UserId, userVersion.Version);
            }

            await _context.SaveChangesAsync();

            // Create audit log entry using AuditService
            var currentUserGuid = Guid.Parse(userId);
            await _auditService.LogAsync(
                LogType.EditGroup, // Using EditGroup as placeholder for user permission changes
                new
                {
                    Action = "SaveUserPermissions",
                    TargetUserId = request.UserId,
                    TargetUserName = targetUser.UserName,
                    PermissionsCount = itemPermissions.Count,
                    RemovedCount = itemsToDelete.Count,
                    AddedCount = itemPermissions.Count,
                    ItemPermissions = validItemGuids.Select(g => g.ToString()).ToList()
                },
                itemId: null,
                userId: currentUserGuid
            );

            _logger.LogInformation("SavePermissions: Successfully saved {Count} permissions for user {UserId} by admin {AdminId}", 
                itemPermissions.Count, request.UserId, userId);

            return Ok(new SavePermissionsResponseDto
            {
                Success = true,
                Message = "User permissions saved successfully",
                PermissionsCount = itemPermissions.Count
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "SavePermissions: Validation error for user {UserId}", request.UserId);
            return BadRequest(new SavePermissionsResponseDto
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "SavePermissions: Unauthorized access attempt");
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SavePermissions: Error saving permissions for user {UserId}: {Message}", 
                request.UserId, ex.Message);
            return StatusCode(500, new SavePermissionsResponseDto
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get user permissions for accessing monitoring items
    /// </summary>
    /// <param name="request">Get permissions request containing the user ID to query</param>
    /// <returns>List of item IDs that the user has access to along with user details</returns>
    /// <remarks>
    /// **Admin-only endpoint** that retrieves all monitoring item permissions for a specific user.
    /// Returns a list of item IDs (GUIDs) that the user is authorized to access.
    /// 
    /// **Use Cases:**
    /// - Viewing current permissions for a user before editing
    /// - Auditing user access rights
    /// - Exporting user permission configuration
    /// - Displaying user permissions in admin UI
    /// 
    /// **Response Details:**
    /// - Returns empty list if user has no permissions
    /// - Includes user information (ID and username) for verification
    /// - Provides total count of accessible items
    /// - Item IDs are returned as GUID strings
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/getpermissions
    ///     {
    ///        "userId": "550e8400-e29b-41d4-a716-446655440000"
    ///     }
    ///     
    /// Sample response:
    /// 
    ///     {
    ///        "success": true,
    ///        "message": "User permissions retrieved successfully",
    ///        "userId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "userName": "johndoe",
    ///        "itemIds": [
    ///            "550e8400-e29b-41d4-a716-446655440001",
    ///            "550e8400-e29b-41d4-a716-446655440002",
    ///            "550e8400-e29b-41d4-a716-446655440003"
    ///        ],
    ///        "totalCount": 3
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Permissions retrieved successfully with list of item IDs</response>
    /// <response code="400">Validation error - invalid request format or invalid user ID</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - Admin role required</response>
    /// <response code="404">User not found - the specified user ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("GetPermissions")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(GetPermissionsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetPermissions([FromBody] GetPermissionsRequestDto request)
    {
        try
        {
            _logger.LogInformation("GetPermissions operation started for user {TargetUserId}", request.UserId);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("GetPermissions: Unauthorized access attempt");
                return Unauthorized(new { success = false, message = "Authentication required" });
            }

            // Validate ModelState
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("GetPermissions: Validation failed for user {TargetUserId}: {Errors}", 
                    request.UserId, string.Join(", ", errors));

                return BadRequest(new GetPermissionsResponseDto
                {
                    Success = false,
                    Message = "Validation failed"
                });
            }

            // Validate UserId is a valid GUID
            if (!Guid.TryParse(request.UserId, out var targetUserGuid))
            {
                _logger.LogWarning("GetPermissions: Invalid UserId format {UserId}", request.UserId);
                return BadRequest(new GetPermissionsResponseDto
                {
                    Success = false,
                    Message = "Invalid user ID format. Must be a valid GUID."
                });
            }

            var targetUser = await _userManager.FindByIdAsync(request.UserId);
            
            if (targetUser == null)
            {
                _logger.LogWarning("GetPermissions: User not found {UserId}", request.UserId);
                return NotFound(new GetPermissionsResponseDto
                {
                    Success = false,
                    Message = "User not found"
                });
            }

            // Retrieve item permissions for the user
            var itemPermissions = await _context.ItemPermissions
                .Where(x => x.UserId == targetUserGuid)
                .Select(x => x.ItemId.ToString())
                .ToListAsync();

            _logger.LogInformation("GetPermissions: Retrieved {Count} permissions for user {UserId}", 
                itemPermissions.Count, request.UserId);

            return Ok(new GetPermissionsResponseDto
            {
                Success = true,
                Message = "User permissions retrieved successfully",
                UserId = request.UserId,
                UserName = targetUser.UserName,
                ItemIds = itemPermissions,
                TotalCount = itemPermissions.Count
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "GetPermissions: Validation error for user {UserId}", request.UserId);
            return BadRequest(new GetPermissionsResponseDto
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "GetPermissions: Unauthorized access attempt");
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetPermissions: Error retrieving permissions for user {UserId}: {Message}", 
                request.UserId, ex.Message);
            return StatusCode(500, new GetPermissionsResponseDto
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get all configured controllers in the system
    /// </summary>
    /// <returns>List of all configured controllers with their connection details and status</returns>
    /// <response code="200">Returns the list of system controllers</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's an error retrieving controllers</response>
    [HttpPost("Controllers")]
    [ProducesResponseType(typeof(GetControllersResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetControllers()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // var userGuid = Guid.Parse(userId);

            var response = new GetControllersResponseDto();

            var controllers = await Core.Controllers.GetSharp7Controllers();

            foreach (var controller in controllers)
            {
                bool isDisabled = false;

                if (controller.IsDisabled.HasValue)
                {
                    isDisabled = controller.IsDisabled.Value;
                }

                response.Data.Add(new GetControllersResponseDto.Controller()
                {
                    Id = controller.Id,
                    Name = controller.Name,
                    DataType = (Share.Libs.DataType)controller.DataType,
                    DBAddress = controller.DBAddress,
                    IPAddress = controller.IPAddress,
                    DBSizeData = controller.DBSizeData,
                    DBStartData = controller.DBStartData,
                    ControllerType = ControllerType.Sharp7,
                    IsDisabled = isDisabled,
                });
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Add a new controller configuration to the system
    /// </summary>
    /// <param name="request">Add controller request containing controller configuration details</param>
    /// <returns>Result indicating success or failure of controller creation</returns>
    /// <response code="200">Returns success status of the controller creation</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("AddController")]
    [ProducesResponseType(typeof(AddControllerResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddController([FromBody] AddControllerRequestDto request)
    {
        try
        {

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new AddControllerResponseDto();

            await Core.Controllers.AddController(new ControllerSharp7()
            {
                Name = request.Name,
                DBAddress = request.DBAddress,
                IPAddress = request.IPAddress,
                DBSizeData = request.DBSizeData,
                DBStartData = request.DBStartData,
                DataType = (Core.Libs.DataType)request.DataType,
            });

            response.IsSuccessful = true;

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Edit an existing controller's configuration
    /// </summary>
    /// <param name="request">Edit controller request containing updated controller configuration</param>
    /// <returns>Result indicating success or failure of controller update operation</returns>
    /// <response code="200">Returns success status of the controller update</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("EditController")]
    public async Task<IActionResult> EditController([FromBody] EditControllerRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new AddControllerResponseDto();

            var result = await Core.Controllers.EditController(new ControllerSharp7()
            {
                Id = request.Id,
                Name = request.Name,
                DBAddress = request.DBAddress,
                IPAddress = request.IPAddress,
                DBSizeData = request.DBSizeData,
                DBStartData = request.DBStartData,
                DataType = (Core.Libs.DataType)request.DataType,
            });

            response.IsSuccessful = result;

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Delete a controller from the system
    /// </summary>
    /// <param name="request">Delete controller request containing the controller ID</param>
    /// <returns>Result indicating success or failure with specific error types if controller is in use</returns>
    /// <response code="200">Returns success status or error details if controller cannot be deleted</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("DeleteController")]
    public async Task<IActionResult> DeleteController([FromBody] DeleteControllerRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new DeleteControllerResponseDto();

            var result = await Core.Controllers.DeleteController(x => x.Id == request.Id);

            if (result)
            {
                response.IsSuccessful = true;
            }
            else
            {
                response.IsSuccessful = false;
                response.Error = DeleteControllerResponseDto.DeleteControllerErrorType.AlreadyInUse;
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    // ==================== Modbus Controller CRUD ====================

    /// <summary>
    /// Get all Modbus controllers configured in the system
    /// </summary>
    /// <returns>List of all Modbus controllers with their configuration details</returns>
    /// <response code="200">Returns the list of Modbus controllers</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's an error retrieving controllers</response>
    [HttpPost("ModbusControllers")]
    [ProducesResponseType(typeof(GetModbusControllersResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetModbusControllers()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new GetModbusControllersResponseDto();
            var controllers = await Core.Controllers.GetModbusControllers();

            foreach (var controller in controllers)
            {
                response.Data.Add(new GetModbusControllersResponseDto.ModbusController
                {
                    Id = controller.Id,
                    Name = controller.Name,
                    IPAddress = controller.IPAddress,
                    Port = controller.Port,
                    StartAddress = controller.StartAddress,
                    DataLength = controller.DataLength,
                    DataType = controller.DataType,
                    Endianness = controller.Endianness,
                    ConnectionType = controller.ConnectionType,
                    ModbusType = controller.ModbusType,
                    UnitIdentifier = controller.UnitIdentifier,
                    AddressBase = controller.AddressBase,
                    IsDisabled = controller.IsDisabled ?? false,
                });
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Add a new Modbus controller configuration to the system
    /// </summary>
    /// <param name="request">Add Modbus controller request containing configuration details</param>
    /// <returns>Result indicating success or failure with the new controller ID</returns>
    /// <response code="200">Returns success status and new controller ID</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("AddModbusController")]
    [ProducesResponseType(typeof(AddModbusControllerResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddModbusController([FromBody] AddModbusControllerRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var controller = new ControllerModbus
            {
                Name = request.Name,
                IPAddress = request.IPAddress,
                Port = request.Port,
                StartAddress = request.StartAddress,
                DataLength = request.DataLength,
                DataType = (ModbusDataType)request.DataType,
                Endianness = request.Endianness.HasValue ? (Endianness)request.Endianness.Value : Endianness.None,
                ConnectionType = request.ConnectionType.HasValue ? (ModbusConnectionType)request.ConnectionType.Value : ModbusConnectionType.TCP,
                ModbusType = request.ModbusType.HasValue ? (MyModbusType)request.ModbusType.Value : MyModbusType.None,
                UnitIdentifier = request.UnitIdentifier ?? 1,
                AddressBase = request.AddressBase.HasValue ? (ModbusAddressBase)request.AddressBase.Value : ModbusAddressBase.Base0,
                IsDisabled = request.IsDisabled,
            };

            var controllerId = await Core.Controllers.AddModbusController(controller);

            return Ok(new AddModbusControllerResponseDto
            {
                IsSuccessful = true,
                ControllerId = controllerId,
            });
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
            return Ok(new AddModbusControllerResponseDto
            {
                IsSuccessful = false,
                ErrorMessage = "An error occurred while adding the controller",
            });
        }
    }

    /// <summary>
    /// Edit an existing Modbus controller's configuration
    /// </summary>
    /// <param name="request">Edit Modbus controller request containing updated configuration</param>
    /// <returns>Result indicating success or failure of the update operation</returns>
    /// <response code="200">Returns success status of the update</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("EditModbusController")]
    [ProducesResponseType(typeof(EditModbusControllerResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> EditModbusController([FromBody] EditModbusControllerRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var controller = new ControllerModbus
            {
                Id = request.Id,
                Name = request.Name,
                IPAddress = request.IPAddress,
                Port = request.Port,
                StartAddress = request.StartAddress,
                DataLength = request.DataLength,
                DataType = (ModbusDataType)request.DataType,
                Endianness = request.Endianness.HasValue ? (Endianness)request.Endianness.Value : Endianness.None,
                ConnectionType = request.ConnectionType.HasValue ? (ModbusConnectionType)request.ConnectionType.Value : ModbusConnectionType.TCP,
                ModbusType = request.ModbusType.HasValue ? (MyModbusType)request.ModbusType.Value : MyModbusType.None,
                UnitIdentifier = request.UnitIdentifier ?? 1,
                AddressBase = request.AddressBase.HasValue ? (ModbusAddressBase)request.AddressBase.Value : ModbusAddressBase.Base0,
                IsDisabled = request.IsDisabled,
            };

            var result = await Core.Controllers.EditModbusController(controller);

            return Ok(new EditModbusControllerResponseDto
            {
                IsSuccessful = result,
                ErrorMessage = result ? null : "Controller not found or update failed",
            });
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
            return Ok(new EditModbusControllerResponseDto
            {
                IsSuccessful = false,
                ErrorMessage = "An error occurred while updating the controller",
            });
        }
    }

    /// <summary>
    /// Delete a Modbus controller from the system
    /// </summary>
    /// <param name="request">Delete request containing the controller ID</param>
    /// <returns>Result indicating success or failure with error details if controller has mappings</returns>
    /// <response code="200">Returns success status or error if controller has mappings</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("DeleteModbusController")]
    [ProducesResponseType(typeof(DeleteModbusControllerResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteModbusController([FromBody] DeleteModbusControllerRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var (success, hasMappings) = await Core.Controllers.DeleteModbusController(request.Id);

            if (success)
            {
                return Ok(new DeleteModbusControllerResponseDto { IsSuccessful = true });
            }

            return Ok(new DeleteModbusControllerResponseDto
            {
                IsSuccessful = false,
                Error = hasMappings 
                    ? DeleteModbusControllerResponseDto.DeleteModbusControllerErrorType.HasMappings 
                    : DeleteModbusControllerResponseDto.DeleteModbusControllerErrorType.NotFound,
                ErrorMessage = hasMappings 
                    ? "Cannot delete controller with existing mappings" 
                    : "Controller not found",
            });
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
            return BadRequest(ModelState);
        }
    }

    /// <summary>
    /// Get Modbus mappings for a specific controller
    /// </summary>
    /// <param name="request">Request containing the controller ID</param>
    /// <returns>List of mappings for the specified controller</returns>
    /// <response code="200">Returns the list of Modbus mappings</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("GetModbusMaps")]
    [ProducesResponseType(typeof(GetModbusMapsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetModbusMaps([FromBody] GetModbusMapsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new GetModbusMapsResponseDto();
            var maps = await Core.Controllers.GetModbusMaps(x => x.ControllerId == request.ControllerId);

            foreach (var map in maps)
            {
                response.Data.Add(new GetModbusMapsResponseDto.ModbusMap
                {
                    Id = map.Id,
                    ControllerId = map.ControllerId,
                    Position = map.Position,
                    ItemId = map.ItemId,
                    OperationType = map.OperationType,
                });
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
            return BadRequest(ModelState);
        }
    }

    /// <summary>
    /// Get all Modbus mappings for a specific item (allows multiple mappings per item)
    /// </summary>
    /// <param name="request">Request containing the item ID</param>
    /// <returns>List of mappings for the specified item with controller details</returns>
    /// <response code="200">Returns the list of Modbus mappings with controller info</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("GetModbusMappingsByItemId")]
    [ProducesResponseType(typeof(GetModbusMappingsByItemIdResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetModbusMappingsByItemId([FromBody] GetModbusMappingsByItemIdRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new GetModbusMappingsByItemIdResponseDto();
            
            // Get all mappings for this item
            var maps = await Core.Controllers.GetModbusMaps(x => x.ItemId == request.ItemId);
            
            // Get all Modbus controllers to join with mappings
            var controllers = await Core.Controllers.GetModbusControllers();
            var controllerDict = controllers.ToDictionary(c => c.Id);

            foreach (var map in maps)
            {
                var controller = controllerDict.GetValueOrDefault(map.ControllerId);
                
                response.Data.Add(new GetModbusMappingsByItemIdResponseDto.ModbusMapWithController
                {
                    Id = map.Id,
                    ControllerId = map.ControllerId,
                    ControllerName = controller?.Name ?? string.Empty,
                    IpAddress = controller?.IPAddress ?? string.Empty,
                    Port = controller?.Port ?? 0,
                    Position = map.Position,
                    ItemId = map.ItemId,
                    OperationType = map.OperationType,
                });
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
            return BadRequest(ModelState);
        }
    }

    /// <summary>
    /// Batch edit Modbus mappings (add, update, delete multiple mappings in one operation)
    /// </summary>
    /// <param name="request">Batch edit request containing lists of mappings to add, update, and delete</param>
    /// <returns>Result indicating success or failure of the batch operation</returns>
    /// <response code="200">Returns success status with counts of affected mappings</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("BatchEditModbusMaps")]
    [ProducesResponseType(typeof(BatchEditModbusMapsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BatchEditModbusMaps([FromBody] BatchEditModbusMapsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // Prepare added mappings
            var added = request.Added.Select(m => new MapModbus
            {
                ControllerId = request.ControllerId,
                Position = m.Position,
                ItemId = m.ItemId,
                OperationType = m.OperationType.HasValue ? (Core.Libs.IoOperationType)m.OperationType.Value : null,
            }).ToList();

            // Prepare updated mappings
            var updated = request.Changed.Where(m => m.Id.HasValue).Select(m => new MapModbus
            {
                Id = m.Id!.Value,
                ControllerId = request.ControllerId,
                Position = m.Position,
                ItemId = m.ItemId,
                OperationType = m.OperationType.HasValue ? (Core.Libs.IoOperationType)m.OperationType.Value : null,
            }).ToList();

            // Prepare removed mappings - fetch full entities
            var removed = new List<MapModbus>();
            if (request.Removed.Count > 0)
            {
                removed = await Core.Controllers.GetModbusMaps(x => request.Removed.Contains(x.Id));
            }

            var result = await Core.Controllers.BatchEditModbusMaps(added, updated, removed);

            return Ok(new BatchEditModbusMapsResponseDto
            {
                IsSuccessful = result,
                AddedCount = added.Count,
                ChangedCount = updated.Count,
                RemovedCount = removed.Count,
                ErrorMessage = result ? null : "Failed to save mappings",
            });
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
            return Ok(new BatchEditModbusMapsResponseDto
            {
                IsSuccessful = false,
                ErrorMessage = "An error occurred while saving mappings",
            });
        }
    }

    /// <summary>
    /// Delete a monitoring group from the system if it is empty
    /// </summary>
    /// <param name="request">Delete group request containing the group ID to delete</param>
    /// <returns>Result indicating success or failure with specific error information</returns>
    /// <remarks>
    /// Deletes a monitoring group from the system only if it meets the following conditions:
    /// - The group exists
    /// - The group contains no child groups (subfolders)
    /// - The group contains no monitoring items
    /// 
    /// ⚠️ **IMPORTANT**: Groups (folders) must be empty before deletion. This operation will fail if:
    /// - The group has any child groups nested under it
    /// - The group has any monitoring items assigned to it
    /// - Both child groups and items exist in the group
    /// 
    /// **Before deleting a group, you must:**
    /// 1. Move or delete all child groups (subfolders) to other locations
    /// 2. Move or delete all monitoring items to other groups
    /// 3. Ensure the group is completely empty
    /// 
    /// This safety mechanism prevents accidental deletion of group hierarchies and ensures
    /// data integrity by requiring explicit removal of all children first.
    /// 
    /// The operation creates an audit log entry recording the deletion action for compliance.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/deletegroup
    ///     {
    ///        "id": "550e8400-e29b-41d4-a716-446655440000"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Group deleted successfully or detailed error message with reason for failure</response>
    /// <response code="400">Validation error - invalid request format, group has children, or group has items</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - insufficient permissions to delete this group</response>
    /// <response code="404">Group not found - the specified group ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("DeleteGroup")]
    [ProducesResponseType(typeof(DeleteGroupResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(DeleteGroupResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(DeleteGroupResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(DeleteGroupResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteGroup([FromBody] DeleteGroupRequestDto request)
    {
        try
        {
            _logger.LogInformation("DeleteGroup operation started: GroupId={GroupId}", request?.Id);

            // Validate user authentication
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("DeleteGroup: Unauthorized access attempt");
                return Unauthorized();
            }

            // Validate ModelState
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("DeleteGroup validation failed: UserId={UserId}, Errors={Errors}", 
                    userId, string.Join(", ", errors));

                return BadRequest(new DeleteGroupResponseDto
                {
                    Success = false,
                    Message = $"Validation failed: {string.Join(", ", errors)}",
                    Error = DeleteGroupResponseDto.DeleteGroupErrorType.ValidationError
                });
            }

            if (!Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogError("DeleteGroup: Invalid user ID format - UserId={UserId}", userId);
                return BadRequest(new DeleteGroupResponseDto
                {
                    Success = false,
                    Message = "Invalid user ID format",
                    Error = DeleteGroupResponseDto.DeleteGroupErrorType.ValidationError
                });
            }

            // Check if group exists
            var group = await _context.Groups.FirstOrDefaultAsync(x => x.Id == request.Id);

            if (group == null)
            {
                _logger.LogWarning("DeleteGroup: Group not found - GroupId={GroupId}, UserId={UserId}", 
                    request.Id, userId);
                
                return NotFound(new DeleteGroupResponseDto
                {
                    Success = false,
                    Message = $"Group with ID {request.Id} not found",
                    Error = DeleteGroupResponseDto.DeleteGroupErrorType.GroupNotFound
                });
            }

            // Check if group has child groups
            var hasChildGroups = await _context.Groups.AnyAsync(x => x.ParentId == request.Id);
            
            // Check if group has items
            var hasItems = await _context.GroupItems.AnyAsync(x => x.GroupId == request.Id);

            // Determine if group is empty and provide specific error messages
            if (hasChildGroups && hasItems)
            {
                _logger.LogWarning("DeleteGroup: Group contains both child groups and items - GroupId={GroupId}, UserId={UserId}", 
                    request.Id, userId);
                
                return BadRequest(new DeleteGroupResponseDto
                {
                    Success = false,
                    Message = "Cannot delete group: The group contains both child groups (subfolders) and monitoring items. Please move or delete all child groups and items first.",
                    Error = DeleteGroupResponseDto.DeleteGroupErrorType.GroupNotEmpty
                });
            }
            else if (hasChildGroups)
            {
                _logger.LogWarning("DeleteGroup: Group contains child groups - GroupId={GroupId}, UserId={UserId}", 
                    request.Id, userId);
                
                return BadRequest(new DeleteGroupResponseDto
                {
                    Success = false,
                    Message = "Cannot delete group: The group contains child groups (subfolders). Please move or delete all child groups first.",
                    Error = DeleteGroupResponseDto.DeleteGroupErrorType.GroupHasChildren
                });
            }
            else if (hasItems)
            {
                _logger.LogWarning("DeleteGroup: Group contains items - GroupId={GroupId}, UserId={UserId}", 
                    request.Id, userId);
                
                return BadRequest(new DeleteGroupResponseDto
                {
                    Success = false,
                    Message = "Cannot delete group: The group contains monitoring items. Please move or delete all items first.",
                    Error = DeleteGroupResponseDto.DeleteGroupErrorType.GroupHasItems
                });
            }

            // Group is empty, proceed with deletion
            _context.Groups.Remove(group);
            await _context.SaveChangesAsync();

            // Create audit log entry using AuditService
            await _auditService.LogAsync(
                LogType.DeleteGroup,
                new
                {
                    GroupId = group.Id,
                    GroupName = group.Name,
                    GroupNameFa = group.NameFa,
                    ParentId = group.ParentId,
                    DeletedBy = userId,
                    Action = "DeleteGroup"
                },
                itemId: null,
                userId: userGuid
            );

            _logger.LogInformation("DeleteGroup: Successfully deleted group {GroupId} (Name: '{GroupName}') by user {UserId}", 
                group.Id, group.Name, userId);

            return Ok(new DeleteGroupResponseDto
            {
                Success = true,
                Message = "Monitoring group deleted successfully"
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "DeleteGroup: Validation error - {Message}", ex.Message);
            return BadRequest(new DeleteGroupResponseDto
            {
                Success = false,
                Message = ex.Message,
                Error = DeleteGroupResponseDto.DeleteGroupErrorType.ValidationError
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "DeleteGroup: Unauthorized access attempt");
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DeleteGroup: Error deleting group {GroupId}: {Message}", 
                request.Id, ex.Message);
            return StatusCode(StatusCodes.Status500InternalServerError, new DeleteGroupResponseDto
            {
                Success = false,
                Message = "Internal server error",
                Error = DeleteGroupResponseDto.DeleteGroupErrorType.UnknownError
            });
        }
    }

    /// <summary>
    /// Move a group to a different parent group in the hierarchy
    /// </summary>
    /// <param name="request">Move group request containing group ID and new parent ID</param>
    /// <returns>Result indicating success or failure of group move operation</returns>
    /// <remarks>
    /// Moves a monitoring group from its current position to a new parent in the hierarchy.
    /// This operation reorganizes the group structure and can move groups to root level (ParentId = null).
    /// 
    /// The operation validates:
    /// - The group exists
    /// - The parent group exists (if ParentId is provided)
    /// - No circular references (cannot move a group to itself or to one of its descendants)
    /// 
    /// Sample request to move group to another parent:
    /// 
    ///     POST /api/monitoring/movegroup
    ///     {
    ///        "groupId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "parentId": "550e8400-e29b-41d4-a716-446655440001"
    ///     }
    ///     
    /// Sample request to move group to root level:
    /// 
    ///     POST /api/monitoring/movegroup
    ///     {
    ///        "groupId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "parentId": null
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Group successfully moved to the target parent</response>
    /// <response code="400">Validation error - invalid request, group cannot be moved to itself, or circular reference detected</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="404">Group or parent group not found</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("MoveGroup")]
    [ProducesResponseType(typeof(MoveGroupResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MoveGroupResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(MoveGroupResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(MoveGroupResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> MoveGroup([FromBody] MoveGroupRequestDto request)
    {
        try
        {
            _logger.LogInformation("MoveGroup operation started: GroupId={GroupId}, ParentId={ParentId}", 
                request?.GroupId, request?.ParentId);

            // Validate request is not null
            if (request == null)
            {
                _logger.LogWarning("MoveGroup failed: Request is null");
                return BadRequest(new MoveGroupResponseDto
                {
                    IsSuccessful = false,
                    Message = "Request body is required",
                    Error = MoveGroupResponseDto.MoveGroupErrorType.ValidationError
                });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("MoveGroup failed: User not authenticated");
                return Unauthorized();
            }

            // Check ModelState
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("MoveGroup validation failed: UserId={UserId}, Errors={Errors}", 
                    userId, string.Join(", ", errors));

                return BadRequest(new MoveGroupResponseDto
                { 
                    IsSuccessful = false,
                    Message = $"Validation failed: {string.Join(", ", errors)}",
                    Error = MoveGroupResponseDto.MoveGroupErrorType.ValidationError
                });
            }

            // Validate: Cannot move group to itself
            if (request.ParentId.HasValue && request.GroupId == request.ParentId.Value)
            {
                _logger.LogWarning("MoveGroup failed: Attempt to move group to itself - GroupId={GroupId}, UserId={UserId}", 
                    request.GroupId, userId);
                
                return BadRequest(new MoveGroupResponseDto
                {
                    IsSuccessful = false,
                    Message = "Cannot move a group to itself",
                    Error = MoveGroupResponseDto.MoveGroupErrorType.CannotMoveToSelf
                });
            }

            // Check if group exists
            var group = await _context.Groups.FirstOrDefaultAsync(x => x.Id == request.GroupId);

            if (group == null)
            {
                _logger.LogWarning("MoveGroup failed: Group not found - GroupId={GroupId}, UserId={UserId}", 
                    request.GroupId, userId);
                
                return NotFound(new MoveGroupResponseDto
                {
                    IsSuccessful = false,
                    Message = $"Group with ID {request.GroupId} not found",
                    Error = MoveGroupResponseDto.MoveGroupErrorType.GroupNotFound
                });
            }

            // Validate parent group exists if ParentId is provided
            if (request.ParentId.HasValue)
            {
                var parentGroup = await _context.Groups.FirstOrDefaultAsync(g => g.Id == request.ParentId.Value);
                
                if (parentGroup == null)
                {
                    _logger.LogWarning("MoveGroup failed: Parent group not found - ParentId={ParentId}, UserId={UserId}", 
                        request.ParentId.Value, userId);
                    
                    return NotFound(new MoveGroupResponseDto
                    {
                        IsSuccessful = false,
                        Message = $"Parent group with ID {request.ParentId.Value} not found",
                        Error = MoveGroupResponseDto.MoveGroupErrorType.ParentGroupNotFound
                    });
                }

                // Check for circular reference (prevent moving a group to one of its descendants)
                var isCircular = await IsCircularReference(request.GroupId, request.ParentId.Value);
                
                if (isCircular)
                {
                    _logger.LogWarning("MoveGroup failed: Circular reference detected - GroupId={GroupId}, ParentId={ParentId}, UserId={UserId}", 
                        request.GroupId, request.ParentId.Value, userId);
                    
                    return BadRequest(new MoveGroupResponseDto
                    {
                        IsSuccessful = false,
                        Message = "Cannot move a group to one of its descendants (circular reference)",
                        Error = MoveGroupResponseDto.MoveGroupErrorType.CircularReference
                    });
                }
            }

            // Store old parent ID for logging
            var oldParentId = group.ParentId;

            // Update group's parent
            group.ParentId = request.ParentId;
            await _context.SaveChangesAsync();

            // Create audit log entry
            var userGuid = Guid.Parse(userId);
            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();
            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

            var auditLogData = new
            {
                GroupId = group.Id,
                GroupName = group.Name,
                OldParentId = oldParentId,
                NewParentId = request.ParentId,
                ModifiedBy = userId
            };

            var logValueJson = JsonConvert.SerializeObject(auditLogData, Formatting.Indented);

            await _context.AuditLogs.AddAsync(new AuditLog
            {
                IsUser = true,
                UserId = userGuid,
                ItemId = null,
                ActionType = LogType.EditGroup,
                IpAddress = ipAddress,
                LogValue = logValueJson,
                Time = epochTime,
            });
            await _context.SaveChangesAsync();

            _logger.LogInformation("MoveGroup operation completed successfully: GroupId={GroupId}, OldParentId={OldParentId}, NewParentId={NewParentId}, UserId={UserId}", 
                request.GroupId, oldParentId, request.ParentId, userId);

            return Ok(new MoveGroupResponseDto
            {
                IsSuccessful = true,
                Message = "Group moved successfully"
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "MoveGroup validation error: GroupId={GroupId}, ParentId={ParentId}", 
                request?.GroupId, request?.ParentId);
            return BadRequest(new MoveGroupResponseDto
            {
                IsSuccessful = false,
                Message = ex.Message,
                Error = MoveGroupResponseDto.MoveGroupErrorType.ValidationError
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "MoveGroup unauthorized access: GroupId={GroupId}", request?.GroupId);
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in MoveGroup operation: GroupId={GroupId}, ParentId={ParentId}, Message={Message}", 
                request?.GroupId, request?.ParentId, ex.Message);
            return StatusCode(StatusCodes.Status500InternalServerError, new MoveGroupResponseDto
            {
                IsSuccessful = false,
                Message = "Internal server error",
                Error = MoveGroupResponseDto.MoveGroupErrorType.UnknownError
            });
        }
    }

    /// <summary>
    /// Helper method to detect circular references in group hierarchy
    /// </summary>
    /// <param name="groupId">The group being moved</param>
    /// <param name="targetParentId">The target parent group</param>
    /// <returns>True if moving would create a circular reference, false otherwise</returns>
    private async Task<bool> IsCircularReference(Guid groupId, Guid targetParentId)
    {
        var currentId = targetParentId;
        var visitedGroups = new HashSet<Guid> { groupId };

        while (currentId != Guid.Empty)
        {
            // If we encounter the group being moved, it's a circular reference
            if (visitedGroups.Contains(currentId))
            {
                return true;
            }

            visitedGroups.Add(currentId);

            // Get the parent of the current group
            var currentGroup = await _context.Groups
                .AsNoTracking()
                .FirstOrDefaultAsync(g => g.Id == currentId);

            if (currentGroup == null || !currentGroup.ParentId.HasValue)
            {
                // Reached root or invalid group
                break;
            }

            currentId = currentGroup.ParentId.Value;
        }

        return false;
    }

    /// <summary>
    /// Move a monitoring point to a different group
    /// </summary>
    /// <param name="request">Move point request containing point ID and new parent group ID</param>
    /// <returns>Result indicating success or failure of point move operation</returns>
    /// <remarks>
    /// Moves a monitoring point from its current group to a new group. If the point is not assigned
    /// to any group yet, it will create a new group assignment. This operation updates the group
    /// hierarchy and affects which users can access the point based on their group permissions.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/movepoint
    ///     {
    ///        "pointId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "parentId": "550e8400-e29b-41d4-a716-446655440001"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Point successfully moved to the target group</response>
    /// <response code="400">Validation error - invalid point ID, parent ID, or request format</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="404">Point or group not found</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("MovePoint")]
    [ProducesResponseType(typeof(MovePointResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> MovePoint([FromBody] MovePointRequestDto request)
    {
        try
        {
            _logger.LogInformation("MovePoint operation started: PointId={PointId}, ParentId={ParentId}", 
                request?.PointId, request?.ParentId);

            // Validate request is not null
            if (request == null)
            {
                _logger.LogWarning("MovePoint failed: Request is null");
                return BadRequest(new { success = false, message = "Request body is required" });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("MovePoint failed: User not authenticated");
                return Unauthorized(new { success = false, message = "Authentication required" });
            }

            // Check ModelState
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("MovePoint validation failed: UserId={UserId}, Errors={Errors}", 
                    userId, string.Join(", ", errors));

                return BadRequest(new 
                { 
                    success = false, 
                    message = "Validation failed", 
                    errors = errors 
                });
            }

            // Validate that the destination group exists
            var targetGroupExists = await _context.Groups.AnyAsync(g => g.Id == request.ParentId);
            if (!targetGroupExists)
            {
                _logger.LogWarning("MovePoint failed: Target group not found - GroupId={GroupId}, UserId={UserId}", 
                    request.ParentId, userId);
                
                return NotFound(new 
                { 
                    success = false, 
                    message = $"Target group with ID {request.ParentId} not found" 
                });
            }

            // Check if the point exists in the system (optional validation)
            var pointExistsInCore = await Core.Points.GetPoint(request.PointId);
            if (pointExistsInCore == null)
            {
                _logger.LogWarning("MovePoint failed: Point not found in Core - PointId={PointId}, UserId={UserId}", 
                    request.PointId, userId);
                
                return NotFound(new 
                { 
                    success = false, 
                    message = $"Point with ID {request.PointId} not found" 
                });
            }

            var point = await _context.GroupItems.FirstOrDefaultAsync(x => x.ItemId == request.PointId);
            
            if (point == null)
            {
                // Point has no group assignment yet - create new assignment
                _logger.LogInformation("Creating new group assignment: PointId={PointId}, GroupId={GroupId}, UserId={UserId}", 
                    request.PointId, request.ParentId, userId);

                point = new GroupItem()
                {
                    ItemId = request.PointId,
                    GroupId = request.ParentId,
                };

                await _context.GroupItems.AddAsync(point);
            }
            else
            {
                // Update existing group assignment
                var oldGroupId = point.GroupId;
                _logger.LogInformation("Updating group assignment: PointId={PointId}, OldGroupId={OldGroupId}, NewGroupId={NewGroupId}, UserId={UserId}", 
                    request.PointId, oldGroupId, request.ParentId, userId);

                point.GroupId = request.ParentId;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("MovePoint operation completed successfully: PointId={PointId}, ParentId={ParentId}, UserId={UserId}", 
                request.PointId, request.ParentId, userId);

            var response = new MovePointResponseDto()
            {
                IsSuccessful = true,
                Message = "Point moved successfully to the target group"
            };

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "MovePoint validation error: PointId={PointId}, ParentId={ParentId}", 
                request?.PointId, request?.ParentId);
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "MovePoint unauthorized access: PointId={PointId}", request?.PointId);
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in MovePoint operation: PointId={PointId}, ParentId={ParentId}, Message={Message}", 
                request?.PointId, request?.ParentId, ex.Message);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get Sharp7 mappings by item ID
    /// </summary>
    /// <param name="request">Request containing the item ID to get mappings for</param>
    /// <returns>List of Sharp7 mappings for the specified item, including controller details</returns>
    /// <response code="200">Returns the Sharp7 mappings with controller information</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("GetSharp7MappingsByItemId")]
    [ProducesResponseType(typeof(GetSharp7MappingsByItemIdResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetSharp7MappingsByItemId([FromBody] GetSharp7MappingsByItemIdRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new GetSharp7MappingsByItemIdResponseDto();
            
            // Get all mappings for this item
            var maps = await Core.Controllers.GetSharp7Maps(x => x.ItemId == request.ItemId);
            
            // Get all Sharp7 controllers to join with mappings
            var controllers = await Core.Controllers.GetSharp7Controllers();
            var controllerDict = controllers.ToDictionary(c => c.Id);

            foreach (var map in maps)
            {
                var controller = controllerDict.GetValueOrDefault(map.ControllerId);
                
                response.Data.Add(new GetSharp7MappingsByItemIdResponseDto.Sharp7MapWithController
                {
                    Id = map.Id,
                    ControllerId = map.ControllerId,
                    ControllerName = controller?.Name ?? string.Empty,
                    IpAddress = controller?.IPAddress ?? string.Empty,
                    DbAddress = controller?.DBAddress ?? 0,
                    DbStartData = controller?.DBStartData ?? 0,
                    DbSizeData = controller?.DBSizeData ?? 0,
                    DataType = controller?.DataType ?? Core.Libs.DataType.Bit,
                    Position = map.Position,
                    Bit = map.Bit,
                    ItemId = map.ItemId,
                    OperationType = map.OperationType,
                });
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
            return BadRequest(ModelState);
        }
    }

    /// <summary>
    /// Get controller mappings for I/O operations
    /// </summary>
    /// <param name="request">Get mappings request containing controller ID and operation type filters</param>
    /// <returns>List of controller mappings for the specified criteria</returns>
    /// <response code="200">Returns the controller mappings</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("GetMappings")]
    public async Task<IActionResult> GetMappings([FromBody] GetControllerMappingsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new GetControllerMappingsResponseDto();
            response.Mappings = [];

            if (request.ControllerType == ControllerType.Sharp7)
            {
                List<MapSharp7> result = new List<MapSharp7>();

                if (request.ControllerId != null)
                {
                    result = await Core.Controllers.GetSharp7Maps(x => x.ControllerId == request.ControllerId
                                                                       & x.OperationType ==
                                                                       (Core.Libs.IoOperationType?)request.OperationType);
                }
                else
                {
                    result = await Core.Controllers.GetSharp7Maps(x => x.OperationType ==
                                                                       (Core.Libs.IoOperationType?)request.OperationType);
                }

                foreach (var sharp7 in result)
                {
                    response.Mappings.Add(new GetControllerMappingsResponseDto.Mapping()
                    {
                        Id = sharp7.Id,
                        ControllerId = sharp7.ControllerId,
                        ItemId = sharp7.ItemId,
                        Position = sharp7.Position,
                        Bit = sharp7.Bit,
                        OperationType = request.OperationType,
                    });
                }
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Batch edit controller mappings (add, update, delete multiple mappings in one operation)
    /// </summary>
    /// <param name="request">Batch edit request containing lists of mappings to add, update, and delete</param>
    /// <returns>Result indicating success or failure of the batch mapping operation</returns>
    /// <response code="200">Returns success status of the batch mapping operation</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("BatchEditMappings")]
    public async Task<IActionResult> BatchEditMappings([FromBody] BatchEditMappingsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new BatchEditMappingsResponseDto();
            var maps = await Core.Controllers.GetSharp7Maps(x => x.ControllerId == request.ControllerId);
            List<MapSharp7> listDelete = [];
            List<MapSharp7> listAdd = [];
            List<MapSharp7> listUpdate = [];

            foreach (var map in request.Removed)
            {
                var match = maps.FirstOrDefault(x => x.Id == map.Id);
                if (match != null)
                {
                    listDelete.Add(match);
                }
            }

            foreach (var map in request.Added)
            {
                listAdd.Add(new MapSharp7()
                {
                    ItemId = map.ItemId,
                    Position = map.Position,
                    Bit = map.Bit,
                    ControllerId = map.ControllerId,
                    OperationType = (Core.Libs.IoOperationType?)request.OperationType,
                });
            }

            foreach (var map in request.Changed)
            {
                var match = maps.FirstOrDefault(x => x.Id == map.Id);
                if (match != null)
                {
                    match.ItemId = map.ItemId;
                    match.Position = map.Position;
                    match.Bit = map.Bit;
                    match.ControllerId = map.ControllerId;
                    match.OperationType = (Core.Libs.IoOperationType?)request.OperationType;

                    listUpdate.Add(match);
                }
            }

            var result = await Core.Controllers.BatchEditMappings(listAdd, listUpdate, listDelete);

            response.IsSuccess = result;
            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }


    /// <summary>
    /// Add a new alarm configuration for a monitoring item
    /// </summary>
    /// <param name="request">Add alarm request containing alarm configuration details including thresholds, comparison type, and priority</param>
    /// <returns>Result indicating success or failure of alarm creation with created alarm ID</returns>
    /// <remarks>
    /// Creates a new alarm configuration for a monitoring item. Alarms monitor item values and trigger notifications 
    /// when specified conditions are met based on the alarm type and configured parameters.
    /// 
    /// **Alarm Types:**
    /// - Comparative (1): For digital and analog values using comparison logic with thresholds (Value1/Value2) and comparison operators
    /// - Timeout (2): Time-based alarm that triggers after a specified timeout duration without receiving data updates
    /// 
    /// **Comparison Types:** (Used only with Comparative alarm type)
    /// - Equal (0): Value equals Value1
    /// - NotEqual (1): Value does not equal Value1
    /// - Greater (2): Value is greater than Value1
    /// - GreaterOrEqual (3): Value is greater than or equal to Value1
    /// - Less (4): Value is less than Value1
    /// - LessOrEqual (5): Value is less than or equal to Value1
    /// - Between (6): Value is between Value1 and Value2 (inclusive)
    /// - OutOfRange (7): Value is outside the range Value1 to Value2
    /// 
    /// **Priority Levels:**
    /// - Critical (0): Highest priority - immediate attention required
    /// - High (1): High priority - prompt response needed
    /// - Medium (2): Medium priority - normal response time
    /// - Low (3): Low priority - informational
    /// 
    /// **AlarmDelay:** Number of seconds the condition must persist before triggering (prevents false alarms from transient conditions)
    /// 
    /// **Timeout:** Required for AlarmType 2 (Timeout-based alarms) - specifies the duration in seconds before the timeout alarm triggers. Not used for Comparative alarm type
    /// 
    /// Sample request for a critical high-temperature alarm (Comparative with Greater Than):
    /// 
    ///     POST /api/monitoring/addalarm
    ///     {
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "isDisabled": false,
    ///        "alarmDelay": 5,
    ///        "message": "High temperature detected - immediate action required",
    ///        "messageFa": "تشخیص دمای بالا - اقدام فوری مورد نیاز است",
    ///        "value1": "80.0",
    ///        "value2": null,
    ///        "timeout": null,
    ///        "alarmType": 1,
    ///        "alarmPriority": 0,
    ///        "compareType": 2
    ///     }
    ///     
    /// Sample request for a pressure range alarm (Analog with Between comparison):
    /// 
    ///     POST /api/monitoring/addalarm
    ///     {
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440001",
    ///        "isDisabled": false,
    ///        "alarmDelay": 10,
    ///        "message": "Pressure out of acceptable range",
    ///        "messageFa": "فشار خارج از محدوده قابل قبول",
    ///        "value1": "50.0",
    ///        "value2": "100.0",
    ///        "timeout": null,
    ///        "alarmType": 1,
    ///        "alarmPriority": 2,
    ///        "compareType": 6
    ///     }
    ///     
    /// Sample request for a timeout-based alarm (AlarmType 2 - triggers when no data received):
    /// 
    ///     POST /api/monitoring/addalarm
    ///     {
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440002",
    ///        "isDisabled": false,
    ///        "alarmDelay": 0,
    ///        "message": "Communication timeout - device not responding",
    ///        "messageFa": "وقفه ارتباطی - دستگاه پاسخ نمی‌دهد",
    ///        "value1": null,
    ///        "value2": null,
    ///        "timeout": 300,
    ///        "alarmType": 2,
    ///        "alarmPriority": 1,
    ///        "compareType": 0
    ///     }
    ///     
    /// </remarks>
    /// <response code="201">Alarm created successfully with audit log entry</response>
    /// <response code="400">Validation error - invalid request format, missing required fields, or invalid alarm configuration</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="404">Monitoring item not found - the specified item ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("AddAlarm")]
    [ProducesResponseType(typeof(AddAlarmResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(AddAlarmResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(AddAlarmResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(AddAlarmResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> AddAlarm([FromBody] AddAlarmRequestDto request)
    {
        try
        {
            _logger.LogInformation("AddAlarm operation started: ItemId={ItemId}, AlarmType={AlarmType}, AlarmPriority={AlarmPriority}", 
                request?.ItemId, request?.AlarmType, request?.AlarmPriority);

            // Validate request is not null
            if (request == null)
            {
                _logger.LogWarning("AddAlarm failed: Request is null");
                return BadRequest(new AddAlarmResponseDto
                {
                    Success = false,
                    Message = "Request body is required"
                });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("AddAlarm failed: User not authenticated");
                return Unauthorized(new AddAlarmResponseDto
                {
                    Success = false,
                    Message = "Authentication required"
                });
            }

            // Check ModelState
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("AddAlarm validation failed: UserId={UserId}, ItemId={ItemId}, Errors={Errors}", 
                    userId, request.ItemId, string.Join(", ", errors));

                return BadRequest(new AddAlarmResponseDto
                { 
                    Success = false,
                    Message = $"Validation failed: {string.Join(", ", errors)}"
                });
            }

            // Validate that the monitoring item exists
            var item = await Core.Points.GetPoint(request.ItemId);
            if (item == null)
            {
                _logger.LogWarning("AddAlarm failed: Item not found - ItemId={ItemId}, UserId={UserId}", 
                    request.ItemId, userId);
                
                return NotFound(new AddAlarmResponseDto
                { 
                    Success = false,
                    Message = $"Monitoring item with ID {request.ItemId} not found"
                });
            }

            // Parse user ID to GUID for audit log
            if (!Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogError("AddAlarm failed: Invalid user ID format - UserId={UserId}", userId);
                return StatusCode(StatusCodes.Status500InternalServerError, new AddAlarmResponseDto
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }

            // Prepare alarm object for creation
            var alarmToCreate = new Alarm()
            {
                ItemId = request.ItemId,
                IsDisabled = request.IsDisabled,
                AlarmDelay = request.AlarmDelay,
                Message = request.Message,
                MessageFa = request.MessageFa,
                Value1 = request.Value1,
                Value2 = request.Value2,
                Timeout = request.Timeout,
                AlarmType = (Core.Libs.AlarmType)request.AlarmType,
                AlarmPriority = (Core.Libs.AlarmPriority)request.AlarmPriority,
                CompareType = (Core.Libs.CompareType)request.CompareType,
                HasExternalAlarm = false,
            };

            // Log alarm details before creation for diagnostics
            _logger.LogInformation("Calling Core.Alarms.AddAlarm with parameters: ItemId={ItemId}, AlarmType={AlarmType}, " +
                "AlarmPriority={AlarmPriority}, CompareType={CompareType}, IsDisabled={IsDisabled}, AlarmDelay={AlarmDelay}, " +
                "Message={Message}, MessageFa={MessageFa}, Value1={Value1}, Value2={Value2}, Timeout={Timeout}, HasExternalAlarm={HasExternalAlarm}",
                alarmToCreate.ItemId, alarmToCreate.AlarmType, alarmToCreate.AlarmPriority, alarmToCreate.CompareType,
                alarmToCreate.IsDisabled, alarmToCreate.AlarmDelay, alarmToCreate.Message, alarmToCreate.MessageFa,
                alarmToCreate.Value1, alarmToCreate.Value2, alarmToCreate.Timeout, alarmToCreate.HasExternalAlarm);

            // Create alarm
            var result = await Core.Alarms.AddAlarm(alarmToCreate);

            // Log the result for diagnostics
            _logger.LogInformation("Core.Alarms.AddAlarm returned: AlarmId={AlarmId}, ItemId={ItemId}", 
                result, request.ItemId);

            // Verify alarm creation was successful
            if (result == Guid.Empty)
            {
                _logger.LogError("AddAlarm failed: Core.Alarms.AddAlarm returned empty GUID - ItemId={ItemId}, UserId={UserId}", 
                    request.ItemId, userId);
                
                return StatusCode(StatusCodes.Status500InternalServerError, new AddAlarmResponseDto
                {
                    Success = false,
                    Message = "Failed to create alarm"
                });
            }

            // Create audit log entry
            var logValue = new AddAlarmLog()
            {
                ItemId = request.ItemId,
                IsDisabled = request.IsDisabled,
                AlarmDelay = request.AlarmDelay,
                Message = request.Message,
                MessageFa = request.MessageFa,
                Value1 = request.Value1,
                Value2 = request.Value2,
                Timeout = request.Timeout,
                AlarmType = request.AlarmType,
                AlarmPriority = request.AlarmPriority,
                CompareType = request.CompareType,
                HasExternalAlarm = false,
            };

            var logValueJson = JsonConvert.SerializeObject(logValue, Formatting.Indented);

            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();
            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

            await _context.AuditLogs.AddAsync(new AuditLog()
            {
                IsUser = true,
                UserId = userGuid,
                ItemId = request.ItemId,
                ActionType = LogType.AddAlarm,
                IpAddress = ipAddress,
                LogValue = logValueJson,
                Time = epochTime,
            });
            await _context.SaveChangesAsync();

            _logger.LogInformation("AddAlarm operation completed successfully: AlarmId={AlarmId}, ItemId={ItemId}, UserId={UserId}", 
                result, request.ItemId, userId);

            return StatusCode(StatusCodes.Status201Created, new AddAlarmResponseDto
            {
                Success = true,
                Message = "Alarm created successfully",
                AlarmId = result
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "AddAlarm validation error: ItemId={ItemId}", request?.ItemId);
            return BadRequest(new AddAlarmResponseDto
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "AddAlarm unauthorized access: ItemId={ItemId}", request?.ItemId);
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in AddAlarm operation: ItemId={ItemId}, Message={Message}", 
                request?.ItemId, ex.Message);
            return StatusCode(StatusCodes.Status500InternalServerError, new AddAlarmResponseDto
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Delete an existing alarm configuration from a monitoring item
    /// </summary>
    /// <param name="request">Delete alarm request containing the alarm ID to remove</param>
    /// <returns>Result indicating success or failure of alarm deletion with audit trail</returns>
    /// <remarks>
    /// Permanently removes an alarm configuration from the system. This operation:
    /// - Deletes the alarm record and its configuration (thresholds, comparison logic, priority)
    /// - Creates an audit log entry capturing the deleted alarm details for compliance
    /// - Records the user who performed the deletion and their IP address
    /// - Cannot be undone - alarm data is preserved only in audit logs
    /// 
    /// **Important Notes:**
    /// - Deleting an alarm does NOT delete associated external alarms (if any exist)
    /// - External alarms must be managed separately via BatchEditExternalAlarms endpoint
    /// - The monitoring item itself is not affected - only the alarm configuration is removed
    /// - Active alarms will be cleared once the alarm condition is evaluated after deletion
    /// 
    /// **Use Cases:**
    /// - Removing obsolete or incorrect alarm configurations
    /// - Cleaning up test alarms during commissioning
    /// - Reconfiguring monitoring points with new alarm strategies
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/deletealarm
    ///     {
    ///        "id": "550e8400-e29b-41d4-a716-446655440000"
    ///     }
    ///     
    /// Sample successful response:
    /// 
    ///     {
    ///        "success": true,
    ///        "message": "Alarm deleted successfully"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Alarm deleted successfully with audit log entry created</response>
    /// <response code="400">Validation error - invalid request format, missing alarm ID, or alarm deletion failed</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="404">Alarm not found - the specified alarm ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("DeleteAlarm")]
    [ProducesResponseType(typeof(DeleteAlarmResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(DeleteAlarmResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(DeleteAlarmResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(DeleteAlarmResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteAlarm([FromBody] DeleteAlarmRequestDto request)
    {
        try
        {
            _logger.LogInformation("DeleteAlarm operation started: AlarmId={AlarmId}", request?.Id);

            // Validate request is not null
            if (request == null)
            {
                _logger.LogWarning("DeleteAlarm failed: Request is null");
                return BadRequest(new DeleteAlarmResponseDto
                {
                    Success = false,
                    Message = "Request body is required"
                });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("DeleteAlarm failed: User not authenticated");
                return Unauthorized(new DeleteAlarmResponseDto
                {
                    Success = false,
                    Message = "Authentication required"
                });
            }

            // Check ModelState
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("DeleteAlarm validation failed: UserId={UserId}, AlarmId={AlarmId}, Errors={Errors}",
                    userId, request.Id, string.Join(", ", errors));

                return BadRequest(new DeleteAlarmResponseDto
                {
                    Success = false,
                    Message = $"Validation failed: {string.Join(", ", errors)}"
                });
            }

            // Parse user ID to GUID for audit log
            if (!Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogError("DeleteAlarm failed: Invalid user ID format - UserId={UserId}", userId);
                return StatusCode(StatusCodes.Status500InternalServerError, new DeleteAlarmResponseDto
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }

            // Verify alarm exists before attempting deletion
            var alarm = await Core.Alarms.GetAlarm(request.Id);
            if (alarm == null)
            {
                _logger.LogWarning("DeleteAlarm failed: Alarm not found - AlarmId={AlarmId}, UserId={UserId}",
                    request.Id, userId);

                return NotFound(new DeleteAlarmResponseDto
                {
                    Success = false,
                    Message = $"Alarm with ID {request.Id} not found"
                });
            }

            // Store alarm details for audit log before deletion
            var logValue = new DeleteAlarmLog()
            {
                Id = alarm.Id,
                ItemId = alarm.ItemId,
                IsDisabled = alarm.IsDisabled,
                AlarmDelay = alarm.AlarmDelay,
                Message = alarm.Message,
                MessageFa = alarm.MessageFa,
                Value1 = alarm.Value1,
                Value2 = alarm.Value2,
                Timeout = alarm.Timeout,
                AlarmType = (Share.Libs.AlarmType)alarm.AlarmType,
                AlarmPriority = (Share.Libs.AlarmPriority)alarm.AlarmPriority,
                CompareType = (Share.Libs.CompareType)alarm.CompareType,
            };

            // Delete the alarm
            var result = await Core.Alarms.DeleteAlarm(x => x.Id == request.Id);

            if (!result)
            {
                _logger.LogError("DeleteAlarm failed: Core.Alarms.DeleteAlarm returned false - AlarmId={AlarmId}, UserId={UserId}",
                    request.Id, userId);

                return BadRequest(new DeleteAlarmResponseDto
                {
                    Success = false,
                    Message = "Failed to delete alarm"
                });
            }

            // Create audit log entry
            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();
            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();
            var logValueJson = JsonConvert.SerializeObject(logValue, Formatting.Indented);

            await _context.AuditLogs.AddAsync(new AuditLog()
            {
                IsUser = true,
                UserId = userGuid,
                ItemId = alarm.ItemId,
                ActionType = LogType.DeleteAlarm,
                IpAddress = ipAddress,
                LogValue = logValueJson,
                Time = epochTime,
            });
            await _context.SaveChangesAsync();

            _logger.LogInformation("DeleteAlarm operation completed successfully: AlarmId={AlarmId}, ItemId={ItemId}, UserId={UserId}",
                request.Id, alarm.ItemId, userId);

            return Ok(new DeleteAlarmResponseDto
            {
                Success = true,
                Message = "Alarm deleted successfully"
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "DeleteAlarm validation error: AlarmId={AlarmId}", request?.Id);
            return BadRequest(new DeleteAlarmResponseDto
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "DeleteAlarm unauthorized access: AlarmId={AlarmId}", request?.Id);
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in DeleteAlarm operation: AlarmId={AlarmId}, Message={Message}",
                request?.Id, ex.Message);
            return StatusCode(StatusCodes.Status500InternalServerError, new DeleteAlarmResponseDto
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get all PID controller configurations in the system
    /// </summary>
    /// <param name="request">Get PID controllers request (currently unused but required for POST)</param>
    /// <returns>List of all PID controllers with their configuration parameters</returns>
    /// <response code="200">Returns the list of PID controllers</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's an error retrieving PID controllers</response>
    [HttpPost("GetPidControllers")]
    public async Task<IActionResult> GetPidControllers([FromBody] GetPidControllersRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new GetPidControllersResponseDto();

            var controllers = await Core.PIDs.GetControllers();

            foreach (var controller in controllers)
            {
                response.PidControllers.Add(new GetPidControllersResponseDto.PidController()
                {
                    Id = controller.Id,
                    IsDisabled = controller.IsDisabled,
                    Interval = controller.Interval,
                    Kd = controller.Kd,
                    Ki = controller.Ki,
                    Kp = controller.Kp,
                    DeadZone = controller.DeadZone,
                    FeedForward = controller.FeedForward,
                    OutputMax = controller.OutputMax,
                    OutputMin = controller.OutputMin,
                    SetPoint = controller.SetPoint,
                    DerivativeFilterAlpha = controller.DerivativeFilterAlpha,
                    InputItemId = controller.InputItemId,
                    OutputItemId = controller.OutputItemId,
                    MaxOutputSlewRate = controller.MaxOutputSlewRate,
                    IsAuto = controller.IsAuto,
                    ManualValue = controller.ManualValue,
                });
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Edit a PID controller's configuration parameters
    /// </summary>
    /// <param name="request">Edit PID controller request containing updated configuration parameters</param>
    /// <returns>Result indicating success or failure of PID controller update</returns>
    /// <response code="200">Returns success status of the PID controller update</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("EditPidController")]
    public async Task<IActionResult> EditPidController([FromBody] EditPidControllerRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new EditPidControllerResponseDto();

            var controller = await Core.PIDs.GetController(x => x.Id == request.Controller.Id);

            controller.InputItemId = request.Controller.InputItemId;
            controller.OutputItemId = request.Controller.OutputItemId;
            controller.Kp = request.Controller.Kp;
            controller.Ki = request.Controller.Ki;
            controller.Kd = request.Controller.Kd;
            controller.OutputMin = request.Controller.OutputMin;
            controller.OutputMax = request.Controller.OutputMax;
            controller.Interval = request.Controller.Interval;
            controller.IsDisabled = request.Controller.IsDisabled;
            controller.SetPoint = request.Controller.SetPoint;
            controller.DerivativeFilterAlpha = request.Controller.DerivativeFilterAlpha;
            controller.MaxOutputSlewRate = request.Controller.MaxOutputSlewRate;
            controller.DeadZone = request.Controller.DeadZone;
            controller.FeedForward = request.Controller.FeedForward;
            controller.IsAuto = request.Controller.IsAuto;
            controller.ManualValue = request.Controller.ManualValue;

            var result = await Core.PIDs.EditController(controller);

            response.IsSuccessful = result;

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Write a value directly to a controller for a specific monitoring item
    /// </summary>
    /// <param name="request">Write value request containing item ID, value, optional timestamp, and optional duration</param>
    /// <returns>Result indicating success or failure of the write operation</returns>
    /// <remarks>
    /// Writes a value directly to the controller hardware for the specified monitoring item.
    /// If no timestamp is provided, the current system time will be used. The optional duration 
    /// parameter specifies how long the value should persist or be valid (in seconds).
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/writevalue
    ///     {
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "value": "25.7",
    ///        "time": 1697587200,
    ///        "duration": 60
    ///     }
    ///     
    /// Both the time and duration parameters are optional - if omitted, current system time will be used
    /// and no duration limit will be applied.
    /// </remarks>
    /// <response code="200">Returns success status of the value write operation</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("WriteValue")]
    public async Task<IActionResult> WriteValue([FromBody] WriteValueRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new WriteValueResponseDto();
            var result = await Core.Points.WriteValueToController(request.ItemId, request.Value, request.Time, request.Duration ?? 0);
            response.IsSuccess = result;

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Update the set point value for a specific PID controller
    /// </summary>
    /// <param name="request">Edit PID set point request containing controller ID and new set point value</param>
    /// <returns>Result indicating success or failure of set point update</returns>
    /// <response code="200">Returns success status of the set point update</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("EditPidSetPoint")]
    public async Task<IActionResult> EditPidSetPoint([FromBody] EditPidSetPointRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new EditPidSetPointResponseDto();

            var controller = await Core.PIDs.GetController(x => x.Id == request.PidControllerId);
            controller.SetPoint = request.SetPoint;
            var result = await Core.PIDs.EditController(controller);
            response.IsSuccess = result;

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Get configuration details for a specific PID controller
    /// </summary>
    /// <param name="request">Get PID controller request containing the controller ID</param>
    /// <returns>Detailed configuration of the specified PID controller</returns>
    /// <response code="200">Returns the PID controller configuration</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("GetPidController")]
    public async Task<IActionResult> GetPidController([FromBody] GetPidControllerRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new GetPidControllerResponseDto();

            var controller = await Core.PIDs.GetController(x => x.Id == request.Id);

            response.IsDisabled = controller.IsDisabled;
            response.Interval = controller.Interval;
            response.Kd = controller.Kd;
            response.Ki = controller.Ki;
            response.Kp = controller.Kp;
            response.DeadZone = controller.DeadZone;
            response.FeedForward = controller.FeedForward;
            response.OutputMax = controller.OutputMax;
            response.OutputMin = controller.OutputMin;
            response.SetPoint = controller.SetPoint;
            response.DerivativeFilterAlpha = controller.DerivativeFilterAlpha;
            response.InputItemId = controller.InputItemId;
            response.OutputItemId = controller.OutputItemId;
            response.MaxOutputSlewRate = controller.MaxOutputSlewRate;
            response.IsAuto = controller.IsAuto;
            response.ManualValue = controller.ManualValue;

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Add a new value to the monitoring system using message bus
    /// </summary>
    /// <param name="request">Add value request containing item ID, value, and timestamp</param>
    /// <returns>Result indicating success or failure of the add value operation</returns>
    /// <response code="200">Returns success status of the add value operation</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("AddValue")]
    public async Task<IActionResult> AddValue([FromBody] AddValueRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new AddValueResponseDto() { IsSuccess = false };

            var message = new ReadValuesMessage();
            message.Values.Add(new ReadValuesMessage.ReadValue()
            {
                ItemId = request.ItemId,
                Value = request.Value,
                Time = request.Time,
            });

            await _bus.Send<ReadValuesMessage>(message);

            response.IsSuccess = true;

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Write a value to a monitoring item or add it to the system if write operation fails
    /// </summary>
    /// <param name="request">Write or add value request containing item ID, value, optional timestamp, and optional duration</param>
    /// <returns>Result indicating success or failure of the write or add operation with detailed status message</returns>
    /// <remarks>
    /// Attempts to write a value to the specified monitoring item. If the write operation fails,
    /// the system will attempt to add the value as a new entry. If no timestamp is provided,
    /// the current system time will be used. The optional duration parameter specifies how long
    /// the value should persist or be valid (in seconds).
    /// 
    /// **Duration Parameter:**
    /// - If omitted (null): Uses default behavior (typically 0, meaning infinite)
    /// - If set to 0: Infinite write - the value never expires and persists indefinitely
    /// - If set to a positive value (e.g., 60): The value expires after the specified number of seconds
    /// 
    /// Sample request with temporary write (60 seconds):
    /// 
    ///     POST /api/monitoring/writeoraddvalue
    ///     {
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "value": "25.7",
    ///        "time": 1697587200,
    ///        "duration": 60
    ///     }
    ///     
    /// Sample request with infinite write (never expires):
    /// 
    ///     POST /api/monitoring/writeoraddvalue
    ///     {
    ///        "itemId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "value": "25.7",
    ///        "time": 1697587200,
    ///        "duration": 0
    ///     }
    ///     
    /// Both the time and duration parameters are optional - if omitted, current system time will be used
    /// and duration defaults to 0 (infinite, never expires).
    /// </remarks>
    /// <response code="200">Value successfully written or added to the monitoring item</response>
    /// <response code="400">Validation error - invalid request format, missing required fields, or invalid item ID</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - insufficient permissions for this item</response>
    /// <response code="404">Item not found - the specified item ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("WriteOrAddValue")]
    [ProducesResponseType(typeof(WriteOrAddValueResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> WriteOrAddValue([FromBody] WriteOrAddValueRequestDto request)
    {
        try
        {
            _logger.LogInformation("WriteOrAddValue operation started: ItemId {ItemId}", request?.ItemId);

            // Validate request is not null
            if (request == null)
            {
                _logger.LogWarning("WriteOrAddValue null request received");
                return BadRequest(new { success = false, message = "Request body is required" });
            }

            // Validate model state first
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("WriteOrAddValue validation failed: {Errors}", string.Join("; ", errors));

                return BadRequest(new
                {
                    success = false,
                    message = "Validation failed",
                    errors = errors
                });
            }

            // Extract and validate user ID
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("WriteOrAddValue unauthorized access attempt for item {ItemId}", request.ItemId);
                return Unauthorized(new { success = false, message = "Valid JWT token required" });
            }

            // Validate ItemId
            if (request.ItemId == Guid.Empty)
            {
                _logger.LogWarning("WriteOrAddValue invalid ItemId provided by user {UserId}: {ItemId}", userId, request.ItemId);
                return BadRequest(new { success = false, message = "ItemId cannot be empty" });
            }

            // Validate value
            if (string.IsNullOrWhiteSpace(request.Value))
            {
                _logger.LogWarning("WriteOrAddValue empty value provided by user {UserId} for item {ItemId}", userId, request.ItemId);
                return BadRequest(new { success = false, message = "Value cannot be empty or whitespace" });
            }

            _logger.LogInformation("Executing WriteOrAddValue: User {UserId}, ItemId {ItemId}, Value {Value}, Time {Time}, Duration {Duration}", 
                userId, request.ItemId, request.Value, request.Time, request.Duration);

            var result = await Core.Points.WriteOrAddValue(request.ItemId, request.Value, request.Time, request.Duration ?? 0);

            var response = new WriteOrAddValueResponseDto
            {
                IsSuccess = result
            };

            if (result)
            {
                _logger.LogInformation("WriteOrAddValue completed successfully: User {UserId}, ItemId {ItemId}", userId, request.ItemId);
                return Ok(new { success = true, data = response, message = "Value written or added successfully" });
            }
            else
            {
                _logger.LogWarning("WriteOrAddValue failed: User {UserId}, ItemId {ItemId}, Value {Value}", userId, request.ItemId, request.Value);
                return Ok(new { success = false, data = response, message = "Failed to write or add value" });
            }
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "WriteOrAddValue argument validation failed: ItemId {ItemId}, Message {Message}", 
                request?.ItemId, ex.Message);
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "WriteOrAddValue item not found: ItemId {ItemId}", request?.ItemId);
            return NotFound(new { success = false, message = "Monitoring item not found" });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "WriteOrAddValue unauthorized access: User {UserId}, ItemId {ItemId}", 
                User.FindFirstValue(ClaimTypes.NameIdentifier), request?.ItemId);
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in WriteOrAddValue operation: User {UserId}, ItemId {ItemId}, Message {Message}", 
                User.FindFirstValue(ClaimTypes.NameIdentifier), request?.ItemId, ex.Message);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get all scheduled job triggers in the system
    /// </summary>
    /// <param name="request">Get job triggers request (currently unused but required for POST)</param>
    /// <returns>List of all job triggers with their schedule information</returns>
    /// <response code="200">Returns the list of job triggers</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's an error retrieving job triggers</response>
    [HttpPost("GetJobTriggers")]
    public async Task<IActionResult> GetJobTriggers([FromBody] GetJobTriggersRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new GetJobTriggersResponseDto();

            var triggers = await Core.Jobs.GetTriggers();

            foreach (var trigger in triggers)
            {
                response.Triggers.Add(new GetJobTriggersResponseDto.Trigger()
                {
                    Id = trigger.Id,
                    Name = trigger.Name,
                    StartTime = trigger.StartTime,
                    EndTime = trigger.EndTime,
                    IsDisabled = trigger.IsDisabled,
                });
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Get job details (actions) for a specific trigger
    /// </summary>
    /// <param name="request">Get job details request containing the trigger ID</param>
    /// <returns>List of job details associated with the specified trigger</returns>
    /// <response code="200">Returns the job details for the trigger</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("GetJobDetails")]
    public async Task<IActionResult> GetJobDetails([FromBody] GetJobDetailsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new GetJobDetailsResponseDto();

            var jobDetails = await Core.Jobs.GetJobDetails(request.TriggerId);

            foreach (var j in jobDetails)
            {
                response.Jobs.Add(new GetJobDetailsResponseDto.JobDetail()
                {
                    Id = j.Id,
                    Value = j.Value,
                    ItemId = j.ItemId,
                });
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Save or update a scheduled job with its trigger and job details
    /// </summary>
    /// <param name="request">Save job request containing trigger information and job details to add, update, or remove</param>
    /// <returns>Result indicating success or failure of the job save operation</returns>
    /// <response code="200">Returns success status of the job save operation</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("SaveJob")]
    public async Task<IActionResult> SaveJob([FromBody] SaveJobRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new SaveJobResponseDto();

            var context = new DataContext();

            Trigger? trigger = null;

            if (request.TriggerId == null)
            {
                trigger = new Trigger();
            }
            else
            {
                trigger = await context.Triggers.FirstOrDefaultAsync(x => x.Id == request.TriggerId);
            }

            trigger.IsDisabled = request.IsDisabled;
            trigger.Name = request.TriggerName;
            trigger.StartTime = request.StartTime;
            trigger.EndTime = request.EndTime;

            foreach (var jobDetail in request.Changed)
            {
                var j = await context.JobDetails.FirstOrDefaultAsync(x => x.Id == jobDetail.Id);
                j.Value = jobDetail.Value;
            }

            foreach (var jobDetail in request.Removed)
            {
                var j = await context.JobDetails.FirstOrDefaultAsync(x => x.Id == jobDetail.Id);
                context.JobDetails.Remove(j);
            }

            if (request.TriggerId == null)
            {
                await context.Triggers.AddAsync(trigger);
                await context.SaveChangesAsync();
            }

            foreach (var jobDetail in request.Added)
            {
                await context.JobDetails.AddAsync(new JobDetail()
                {
                    TriggerId = trigger.Id,
                    ItemId = jobDetail.ItemId,
                    Value = jobDetail.Value,
                });
            }

            await context.SaveChangesAsync();
            await context.DisposeAsync();

            response.IsSuccess = true;

            return Ok(response);
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Delete a scheduled job and all its associated job details
    /// </summary>
    /// <param name="request">Delete job request containing the trigger ID</param>
    /// <returns>Result indicating success or failure of the job deletion</returns>
    /// <response code="200">Returns success status of the job deletion</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("DeleteJob")]
    public async Task<IActionResult> DeleteJob([FromBody] DeleteJobRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new DeleteJobResponseDto();

            var context = new DataContext();

            await using (var transaction = await context.Database.BeginTransactionAsync())
            {
                try
                {
                    var jobDetails = await context.JobDetails.Where(x => x.TriggerId == request.Id).ToListAsync();
                    var trigger = await context.Triggers.FirstOrDefaultAsync(x => x.Id == request.Id);

                    context.JobDetails.RemoveRange(jobDetails);
                    context.Triggers.Remove(trigger);

                    await context.SaveChangesAsync();
                    // Commit transaction
                    await transaction.CommitAsync();
                    response.IsSuccess = true;
                }
                catch (Exception ex)
                {
                    // Rollback transaction
                    await transaction.RollbackAsync();
                    MyLog.LogJson(ex);
                }
                finally
                {
                    await context.DisposeAsync();
                }
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Get a specific SVG layout with its content and monitoring point positions
    /// </summary>
    /// <param name="request">Get SVG layout request containing the layout ID</param>
    /// <returns>SVG layout details including content, font size, and monitoring point positions</returns>
    /// <response code="200">Returns the SVG layout details</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("GetSvgLayout")]
    public async Task<IActionResult> GetSvgLayout([FromBody] GetSvgLayoutRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new GetSvgLayoutResponseDto();

            response.Id = request.Id;

            var svg = await _context.SvgLayouts.FirstOrDefaultAsync(x => x.Id == request.Id);
            var svgPoints = await _context.SvgLayoutPoints.Where(x => x.SvgLayoutId == request.Id).ToListAsync();

            response.Content = svg.Content;
            response.FontSize = svg.FontSize;
            response.Name = svg.Name;

            foreach (var point in svgPoints)
            {
                response.Points.Add(new GetSvgLayoutResponseDto.Point()
                {
                    ItemId = point.ItemId,
                    X = point.X,
                    Y = point.Y,
                    BoxColor = point.BoxColor,
                    BoxOpacity = point.BoxOpacity,
                });
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Get all enabled SVG layouts in the system ordered by display order and name
    /// </summary>
    /// <param name="request">Get SVG layouts request (currently unused but required for POST)</param>
    /// <returns>List of all enabled SVG layouts with basic information</returns>
    /// <response code="200">Returns success status and list of SVG layouts</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's an error retrieving SVG layouts</response>
    [HttpPost("GetSvgLayouts")]
    public async Task<IActionResult> GetSvgLayouts([FromBody] GetSvgLayoutsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new GetSvgLayoutsResponseDto();

            var layouts = await _context.SvgLayouts.Where(x => x.IsDisabled == false)
                .OrderBy(x => x.Order)
                .ThenBy(x => x.Name)
                .ToListAsync();

            foreach (var layout in layouts)
            {
                response.Layouts.Add(new GetSvgLayoutsResponseDto.Layout()
                {
                    Id = layout.Id,
                    Name = layout.Name,
                    Content = layout.Content,
                });
            }

            response.IsSuccess = true;
            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    /// <summary>
    /// Get all external alarms linked to a parent alarm
    /// </summary>
    /// <param name="request">Get external alarms request containing the parent alarm ID</param>
    /// <returns>List of external alarm configurations for the specified parent alarm</returns>
    /// <remarks>
    /// Retrieves all external alarm configurations that are linked to a parent alarm.
    /// External alarms allow one alarm condition to trigger outputs on other monitoring items in the system.
    /// 
    /// When a parent alarm is triggered, all associated external alarms will automatically
    /// write their configured values to their respective target items, enabling cascading
    /// alarm actions across the monitoring system.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/getexternalalarms
    ///     {
    ///        "alarmId": "550e8400-e29b-41d4-a716-446655440000"
    ///     }
    ///     
    /// Sample response:
    /// 
    ///     {
    ///       "success": true,
    ///       "message": "External alarms retrieved successfully",
    ///       "externalAlarms": [
    ///         {
    ///           "id": "650e8400-e29b-41d4-a716-446655440001",
    ///           "alarmId": "550e8400-e29b-41d4-a716-446655440000",
    ///           "itemId": "750e8400-e29b-41d4-a716-446655440002",
    ///           "value": true,
    ///           "isDisabled": false
    ///         }
    ///       ]
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns the list of external alarms for the parent alarm</response>
    /// <response code="400">Validation error - invalid request format or alarm ID</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="404">Parent alarm not found - the specified alarm ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("GetExternalAlarms")]
    [ProducesResponseType(typeof(GetExternalAlarmsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(GetExternalAlarmsResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(GetExternalAlarmsResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(GetExternalAlarmsResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetExternalAlarms([FromBody] GetExternalAlarmsRequestDto request)
    {
        try
        {
            _logger.LogInformation("GetExternalAlarms started: AlarmId={AlarmId}", request.AlarmId);

            // Check ModelState first
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("GetExternalAlarms validation failed: AlarmId={AlarmId}, Errors={Errors}",
                    request.AlarmId, string.Join(", ", errors));

                return BadRequest(new GetExternalAlarmsResponseDto
                {
                    Success = false,
                    Message = "Validation failed: " + string.Join(", ", errors),
                    ExternalAlarms = null
                });
            }

            // Get user ID from claims
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("GetExternalAlarms failed: Invalid user ID from token");
                return Unauthorized();
            }

            // Verify parent alarm exists
            var parentAlarm = await Core.Alarms.GetAlarm(request.AlarmId);
            if (parentAlarm == null)
            {
                _logger.LogWarning("GetExternalAlarms failed: Parent alarm not found - AlarmId={AlarmId}, UserId={UserId}",
                    request.AlarmId, userId);

                return NotFound(new GetExternalAlarmsResponseDto
                {
                    Success = false,
                    Message = "Parent alarm not found",
                    ExternalAlarms = null
                });
            }

            // Retrieve external alarms from Core using expression-based query
            var externalAlarms = await Core.Alarms.GetExternalAlarms(ea => ea.AlarmId == request.AlarmId);

            // Map to DTO
            var externalAlarmsList = externalAlarms?.Select(ea => new GetExternalAlarmsResponseDto.ExternalAlarmInfo
            {
                Id = ea.Id,
                AlarmId = ea.AlarmId,
                ItemId = ea.ItemId,
                Value = ea.Value,
                IsDisabled = ea.IsDisabled
            }).ToList() ?? new List<GetExternalAlarmsResponseDto.ExternalAlarmInfo>();

            _logger.LogInformation("GetExternalAlarms completed successfully: AlarmId={AlarmId}, Count={Count}, UserId={UserId}",
                request.AlarmId, externalAlarmsList.Count, userId);

            return Ok(new GetExternalAlarmsResponseDto
            {
                Success = true,
                Message = "External alarms retrieved successfully",
                ExternalAlarms = externalAlarmsList
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "GetExternalAlarms validation failed: AlarmId={AlarmId}", request.AlarmId);
            return BadRequest(new GetExternalAlarmsResponseDto
            {
                Success = false,
                Message = ex.Message,
                ExternalAlarms = null
            });
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "GetExternalAlarms resource not found: AlarmId={AlarmId}", request.AlarmId);
            return NotFound(new GetExternalAlarmsResponseDto
            {
                Success = false,
                Message = ex.Message,
                ExternalAlarms = null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetExternalAlarms error: AlarmId={AlarmId}, Message={Message}",
                request.AlarmId, ex.Message);

            return StatusCode(StatusCodes.Status500InternalServerError, new GetExternalAlarmsResponseDto
            {
                Success = false,
                Message = "Internal server error",
                ExternalAlarms = null
            });
        }
    }

    /// <summary>
    /// Add a new external alarm to a parent alarm
    /// </summary>
    /// <param name="request">Add external alarm request containing parent alarm ID, target item ID, output value, and enabled state</param>
    /// <returns>Result indicating success or failure with the new external alarm ID</returns>
    /// <remarks>
    /// Creates a new external alarm configuration linked to a parent alarm.
    /// External alarms enable cascading alarm actions where one alarm can automatically
    /// control other monitoring items in the system.
    /// 
    /// When the parent alarm is triggered, this external alarm will write the configured
    /// value to the target item. This allows for automated responses such as:
    /// - Triggering indicator lights or sirens
    /// - Activating emergency shutdown procedures
    /// - Setting digital outputs to safe states
    /// - Controlling relays or actuators
    /// 
    /// The operation validates:
    /// - Parent alarm exists in the system
    /// - Target item exists and is valid for output
    /// - No duplicate external alarm configurations
    /// 
    /// Creates an audit log entry for compliance and tracking.
    /// 
    /// Sample request to activate a siren when temperature alarm triggers:
    /// 
    ///     POST /api/monitoring/addexternalalarm
    ///     {
    ///        "alarmId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "itemId": "750e8400-e29b-41d4-a716-446655440002",
    ///        "value": true,
    ///        "isDisabled": false
    ///     }
    ///     
    /// Sample request to deactivate a pump on low pressure alarm:
    /// 
    ///     POST /api/monitoring/addexternalalarm
    ///     {
    ///        "alarmId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "itemId": "850e8400-e29b-41d4-a716-446655440003",
    ///        "value": false,
    ///        "isDisabled": false
    ///     }
    ///     
    /// </remarks>
    /// <response code="201">External alarm created successfully with the new ID</response>
    /// <response code="400">Validation error - invalid request format, parent alarm not found, or target item not found</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - insufficient permissions to create external alarms</response>
    /// <response code="409">Conflict - duplicate external alarm configuration already exists</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("AddExternalAlarm")]
    [ProducesResponseType(typeof(AddExternalAlarmResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(AddExternalAlarmResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(AddExternalAlarmResponseDto), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(AddExternalAlarmResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> AddExternalAlarm([FromBody] AddExternalAlarmRequestDto request)
    {
        try
        {
            _logger.LogInformation("AddExternalAlarm started: AlarmId={AlarmId}, ItemId={ItemId}, Value={Value}, IsDisabled={IsDisabled}",
                request.AlarmId, request.ItemId, request.Value, request.IsDisabled);

            // Check ModelState first
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("AddExternalAlarm validation failed: AlarmId={AlarmId}, ItemId={ItemId}, Errors={Errors}",
                    request.AlarmId, request.ItemId, string.Join(", ", errors));

                return BadRequest(new AddExternalAlarmResponseDto
                {
                    Success = false,
                    Message = "Validation failed: " + string.Join(", ", errors),
                    ExternalAlarmId = null
                });
            }

            // Get user ID from claims
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("AddExternalAlarm failed: Invalid user ID from token");
                return Unauthorized();
            }

            // Parse user GUID for audit logging
            if (!Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogError("AddExternalAlarm failed: Invalid user GUID format - UserId={UserId}", userId);
                return StatusCode(StatusCodes.Status500InternalServerError, new AddExternalAlarmResponseDto
                {
                    Success = false,
                    Message = "Internal server error",
                    ExternalAlarmId = null
                });
            }

            // Verify parent alarm exists
            var parentAlarm = await Core.Alarms.GetAlarm(request.AlarmId);
            if (parentAlarm == null)
            {
                _logger.LogWarning("AddExternalAlarm failed: Parent alarm not found - AlarmId={AlarmId}, UserId={UserId}",
                    request.AlarmId, userId);

                return BadRequest(new AddExternalAlarmResponseDto
                {
                    Success = false,
                    Message = "Parent alarm not found",
                    ExternalAlarmId = null
                });
            }

            // Verify target item exists
            var targetItem = await Core.Points.GetPoint(request.ItemId);
            if (targetItem == null)
            {
                _logger.LogWarning("AddExternalAlarm failed: Target item not found - ItemId={ItemId}, AlarmId={AlarmId}, UserId={UserId}",
                    request.ItemId, request.AlarmId, userId);

                return BadRequest(new AddExternalAlarmResponseDto
                {
                    Success = false,
                    Message = "Target item not found",
                    ExternalAlarmId = null
                });
            }

            // Create external alarm entity
            var externalAlarmId = Guid.NewGuid();
            var externalAlarm = new Core.Models.ExternalAlarm
            {
                Id = externalAlarmId,
                AlarmId = request.AlarmId,
                ItemId = request.ItemId,
                Value = request.Value,
                IsDisabled = request.IsDisabled
            };

            // Add external alarm via Core
            var result = await Core.Alarms.AddExternalAlarm(externalAlarm);

            if (!result)
            {
                _logger.LogError("AddExternalAlarm failed: Core.Alarms.AddExternalAlarm returned false - AlarmId={AlarmId}, ItemId={ItemId}, UserId={UserId}",
                    request.AlarmId, request.ItemId, userId);

                return StatusCode(StatusCodes.Status500InternalServerError, new AddExternalAlarmResponseDto
                {
                    Success = false,
                    Message = "Failed to create external alarm",
                    ExternalAlarmId = null
                });
            }

            // Create audit log entry using AuditService
            await _auditService.LogAsync(
                LogType.AddAlarm,
                new
                {
                    ExternalAlarmId = externalAlarmId,
                    AlarmId = request.AlarmId,
                    ItemId = request.ItemId,
                    Value = request.Value,
                    IsDisabled = request.IsDisabled
                },
                itemId: request.ItemId,
                userId: userGuid
            );

            _logger.LogInformation("AddExternalAlarm completed successfully: ExternalAlarmId={ExternalAlarmId}, AlarmId={AlarmId}, ItemId={ItemId}, UserId={UserId}",
                externalAlarmId, request.AlarmId, request.ItemId, userId);

            return StatusCode(StatusCodes.Status201Created, new AddExternalAlarmResponseDto
            {
                Success = true,
                Message = "External alarm added successfully",
                ExternalAlarmId = externalAlarmId
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "AddExternalAlarm validation failed: AlarmId={AlarmId}, ItemId={ItemId}",
                request.AlarmId, request.ItemId);

            return BadRequest(new AddExternalAlarmResponseDto
            {
                Success = false,
                Message = ex.Message,
                ExternalAlarmId = null
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "AddExternalAlarm conflict: AlarmId={AlarmId}, ItemId={ItemId}",
                request.AlarmId, request.ItemId);

            return Conflict(new AddExternalAlarmResponseDto
            {
                Success = false,
                Message = ex.Message,
                ExternalAlarmId = null
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "AddExternalAlarm unauthorized: AlarmId={AlarmId}, ItemId={ItemId}",
                request.AlarmId, request.ItemId);

            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AddExternalAlarm error: AlarmId={AlarmId}, ItemId={ItemId}, Message={Message}",
                request.AlarmId, request.ItemId, ex.Message);

            return StatusCode(StatusCodes.Status500InternalServerError, new AddExternalAlarmResponseDto
            {
                Success = false,
                Message = "Internal server error",
                ExternalAlarmId = null
            });
        }
    }

    /// <summary>
    /// Update an existing external alarm configuration
    /// </summary>
    /// <param name="request">Update external alarm request containing external alarm ID and updated configuration</param>
    /// <returns>Result indicating success or failure of the update operation</returns>
    /// <remarks>
    /// Updates the configuration of an existing external alarm including:
    /// - Target item to control
    /// - Output value to write when triggered
    /// - Enabled/disabled state
    /// 
    /// This allows modification of external alarm behavior without recreating the configuration.
    /// Use cases include:
    /// - Changing which item is controlled
    /// - Inverting the output value (true to false or vice versa)
    /// - Temporarily disabling an external alarm
    /// - Re-enabling a previously disabled external alarm
    /// 
    /// The operation validates:
    /// - External alarm exists
    /// - Target item exists and is valid
    /// - User has appropriate permissions
    /// 
    /// Creates an audit log entry showing before/after values for all changed properties.
    /// 
    /// Sample request to change target item:
    /// 
    ///     POST /api/monitoring/updateexternalalarm
    ///     {
    ///        "id": "650e8400-e29b-41d4-a716-446655440001",
    ///        "itemId": "850e8400-e29b-41d4-a716-446655440003",
    ///        "value": true,
    ///        "isDisabled": false
    ///     }
    ///     
    /// Sample request to disable external alarm temporarily:
    /// 
    ///     POST /api/monitoring/updateexternalalarm
    ///     {
    ///        "id": "650e8400-e29b-41d4-a716-446655440001",
    ///        "itemId": "750e8400-e29b-41d4-a716-446655440002",
    ///        "value": true,
    ///        "isDisabled": true
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">External alarm updated successfully</response>
    /// <response code="400">Validation error - invalid request format or target item not found</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - insufficient permissions to update this external alarm</response>
    /// <response code="404">External alarm not found - the specified external alarm ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("UpdateExternalAlarm")]
    [ProducesResponseType(typeof(UpdateExternalAlarmResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(UpdateExternalAlarmResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(UpdateExternalAlarmResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(UpdateExternalAlarmResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UpdateExternalAlarm([FromBody] UpdateExternalAlarmRequestDto request)
    {
        try
        {
            _logger.LogInformation("UpdateExternalAlarm started: Id={Id}, ItemId={ItemId}, Value={Value}, IsDisabled={IsDisabled}",
                request.Id, request.ItemId, request.Value, request.IsDisabled);

            // Check ModelState first
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("UpdateExternalAlarm validation failed: Id={Id}, Errors={Errors}",
                    request.Id, string.Join(", ", errors));

                return BadRequest(new UpdateExternalAlarmResponseDto
                {
                    Success = false,
                    Message = "Validation failed: " + string.Join(", ", errors)
                });
            }

            // Get user ID from claims
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("UpdateExternalAlarm failed: Invalid user ID from token");
                return Unauthorized();
            }

            // Parse user GUID for audit logging
            if (!Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogError("UpdateExternalAlarm failed: Invalid user GUID format - UserId={UserId}", userId);
                return StatusCode(StatusCodes.Status500InternalServerError, new UpdateExternalAlarmResponseDto
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }

            // Retrieve existing external alarm for audit trail using expression-based query
            var existingExternalAlarms = await Core.Alarms.GetExternalAlarms(ea => ea.Id == request.Id);
            var existingExternalAlarm = existingExternalAlarms?.FirstOrDefault();

            if (existingExternalAlarm == null)
            {
                _logger.LogWarning("UpdateExternalAlarm failed: External alarm not found - Id={Id}, UserId={UserId}",
                    request.Id, userId);

                return NotFound(new UpdateExternalAlarmResponseDto
                {
                    Success = false,
                    Message = "External alarm not found"
                });
            }

            // Verify target item exists
            var targetItem = await Core.Points.GetPoint(request.ItemId);
            if (targetItem == null)
            {
                _logger.LogWarning("UpdateExternalAlarm failed: Target item not found - ItemId={ItemId}, Id={Id}, UserId={UserId}",
                    request.ItemId, request.Id, userId);

                return BadRequest(new UpdateExternalAlarmResponseDto
                {
                    Success = false,
                    Message = "Target item not found"
                });
            }

            // Store before values for audit log
            var beforeValues = new
            {
                Id = existingExternalAlarm.Id,
                AlarmId = existingExternalAlarm.AlarmId,
                ItemId = existingExternalAlarm.ItemId,
                Value = existingExternalAlarm.Value,
                IsDisabled = existingExternalAlarm.IsDisabled
            };

            // Update external alarm properties
            existingExternalAlarm.ItemId = request.ItemId;
            existingExternalAlarm.Value = request.Value;
            existingExternalAlarm.IsDisabled = request.IsDisabled;

            // Update external alarm via Core
            var result = await Core.Alarms.UpdateExternalAlarm(existingExternalAlarm);

            if (!result)
            {
                _logger.LogError("UpdateExternalAlarm failed: Core.Alarms.UpdateExternalAlarm returned false - Id={Id}, UserId={UserId}",
                    request.Id, userId);

                return StatusCode(StatusCodes.Status500InternalServerError, new UpdateExternalAlarmResponseDto
                {
                    Success = false,
                    Message = "Failed to update external alarm"
                });
            }

            // Store after values for audit log
            var afterValues = new
            {
                Id = request.Id,
                AlarmId = existingExternalAlarm.AlarmId,
                ItemId = request.ItemId,
                Value = request.Value,
                IsDisabled = request.IsDisabled
            };

            // Create audit log entry with before/after comparison using AuditService
            await _auditService.LogAsync(
                LogType.EditAlarm,
                new
                {
                    Before = beforeValues,
                    After = afterValues
                },
                itemId: request.ItemId,
                userId: userGuid
            );

            _logger.LogInformation("UpdateExternalAlarm completed successfully: Id={Id}, ItemId={ItemId}, UserId={UserId}",
                request.Id, request.ItemId, userId);

            return Ok(new UpdateExternalAlarmResponseDto
            {
                Success = true,
                Message = "External alarm updated successfully"
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "UpdateExternalAlarm validation failed: Id={Id}", request.Id);
            return BadRequest(new UpdateExternalAlarmResponseDto
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "UpdateExternalAlarm resource not found: Id={Id}", request.Id);
            return NotFound(new UpdateExternalAlarmResponseDto
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "UpdateExternalAlarm unauthorized: Id={Id}", request.Id);
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "UpdateExternalAlarm error: Id={Id}, Message={Message}",
                request.Id, ex.Message);

            return StatusCode(StatusCodes.Status500InternalServerError, new UpdateExternalAlarmResponseDto
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Remove an external alarm from a parent alarm
    /// </summary>
    /// <param name="request">Remove external alarm request containing the external alarm ID to remove</param>
    /// <returns>Result indicating success or failure of the removal operation</returns>
    /// <remarks>
    /// Deletes an external alarm configuration from the system. This removes the link between
    /// the parent alarm and the target item, preventing automatic control actions when the
    /// parent alarm is triggered.
    /// 
    /// This operation is irreversible. Once removed, the external alarm configuration must be
    /// recreated if needed again. Use the update endpoint to temporarily disable an external
    /// alarm if you might need to re-enable it later.
    /// 
    /// Use cases for removal:
    /// - Decommissioning a controlled item
    /// - Simplifying alarm response actions
    /// - Removing obsolete automation logic
    /// - Cleaning up test configurations
    /// 
    /// The operation validates:
    /// - External alarm exists
    /// - User has appropriate permissions
    /// 
    /// Creates an audit log entry recording the deletion with full configuration details
    /// for compliance and historical tracking.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/removeexternalalarm
    ///     {
    ///        "id": "650e8400-e29b-41d4-a716-446655440001"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">External alarm removed successfully</response>
    /// <response code="400">Validation error - invalid request format or external alarm ID</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - insufficient permissions to remove this external alarm</response>
    /// <response code="404">External alarm not found - the specified external alarm ID does not exist</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("RemoveExternalAlarm")]
    [ProducesResponseType(typeof(RemoveExternalAlarmResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(RemoveExternalAlarmResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(RemoveExternalAlarmResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(RemoveExternalAlarmResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> RemoveExternalAlarm([FromBody] RemoveExternalAlarmRequestDto request)
    {
        try
        {
            _logger.LogInformation("RemoveExternalAlarm started: Id={Id}", request.Id);

            // Check ModelState first
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("RemoveExternalAlarm validation failed: Id={Id}, Errors={Errors}",
                    request.Id, string.Join(", ", errors));

                return BadRequest(new RemoveExternalAlarmResponseDto
                {
                    Success = false,
                    Message = "Validation failed: " + string.Join(", ", errors)
                });
            }

            // Get user ID from claims
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("RemoveExternalAlarm failed: Invalid user ID from token");
                return Unauthorized();
            }

            // Parse user GUID for audit logging
            if (!Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogError("RemoveExternalAlarm failed: Invalid user GUID format - UserId={UserId}", userId);
                return StatusCode(StatusCodes.Status500InternalServerError, new RemoveExternalAlarmResponseDto
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }

            // Retrieve existing external alarm for audit trail before deletion using expression-based query
            var existingExternalAlarms = await Core.Alarms.GetExternalAlarms(ea => ea.Id == request.Id);
            var existingExternalAlarm = existingExternalAlarms?.FirstOrDefault();

            if (existingExternalAlarm == null)
            {
                _logger.LogWarning("RemoveExternalAlarm failed: External alarm not found - Id={Id}, UserId={UserId}",
                    request.Id, userId);

                return NotFound(new RemoveExternalAlarmResponseDto
                {
                    Success = false,
                    Message = "External alarm not found"
                });
            }

            // Store values for audit log before deletion
            var deletedValues = new
            {
                Id = existingExternalAlarm.Id,
                AlarmId = existingExternalAlarm.AlarmId,
                ItemId = existingExternalAlarm.ItemId,
                Value = existingExternalAlarm.Value,
                IsDisabled = existingExternalAlarm.IsDisabled
            };

            // Remove external alarm via Core
            var result = await Core.Alarms.RemoveExternalAlarm(existingExternalAlarm);

            if (!result)
            {
                _logger.LogError("RemoveExternalAlarm failed: Core.Alarms.RemoveExternalAlarm returned false - Id={Id}, UserId={UserId}",
                    request.Id, userId);

                return StatusCode(StatusCodes.Status500InternalServerError, new RemoveExternalAlarmResponseDto
                {
                    Success = false,
                    Message = "Failed to remove external alarm"
                });
            }

            // Create audit log entry with deleted configuration using AuditService
            await _auditService.LogAsync(
                LogType.DeleteAlarm,
                deletedValues,
                itemId: existingExternalAlarm.ItemId,
                userId: userGuid
            );

            _logger.LogInformation("RemoveExternalAlarm completed successfully: Id={Id}, UserId={UserId}",
                request.Id, userId);

            return Ok(new RemoveExternalAlarmResponseDto
            {
                Success = true,
                Message = "External alarm removed successfully"
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "RemoveExternalAlarm validation failed: Id={Id}", request.Id);
            return BadRequest(new RemoveExternalAlarmResponseDto
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "RemoveExternalAlarm resource not found: Id={Id}", request.Id);
            return NotFound(new RemoveExternalAlarmResponseDto
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "RemoveExternalAlarm unauthorized: Id={Id}", request.Id);
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RemoveExternalAlarm error: Id={Id}, Message={Message}",
                request.Id, ex.Message);

            return StatusCode(StatusCodes.Status500InternalServerError, new RemoveExternalAlarmResponseDto
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Batch edit external alarm configurations (add, update, delete multiple in one operation)
    /// </summary>
    /// <param name="request">Batch edit request containing lists of external alarms to add, update, and delete</param>
    /// <returns>Result indicating success or failure with counts of operations performed</returns>
    /// <remarks>
    /// Performs bulk operations on external alarm configurations in a single transaction for improved efficiency.
    /// This endpoint allows you to add new external alarms, update existing ones, and delete obsolete configurations
    /// all in one atomic operation. This is particularly useful when reconfiguring alarm cascades or updating
    /// multiple output actions simultaneously.
    /// 
    /// **Operation Details:**
    /// - **Add**: Creates new external alarm configurations with generated IDs. Validates target items exist.
    /// - **Update**: Modifies existing external alarm configurations. Validates external alarms exist before updating.
    /// - **Delete**: Removes external alarm configurations. Validates external alarms exist before deletion.
    /// 
    /// **Validation:**
    /// - All operations validate that the target items (ItemId) exist in the system
    /// - Update and Delete operations validate that the external alarms (Id) exist
    /// - All operations are performed in a single transaction - if any operation fails, all changes are rolled back
    /// 
    /// **Audit Trail:**
    /// - Each operation type (add/update/delete) creates separate audit log entries
    /// - Audit logs capture before/after states for update operations
    /// - All changes are logged with user ID, timestamp, and IP address
    /// 
    /// Sample request adding 2 external alarms, updating 1, and deleting 1:
    /// 
    ///     POST /api/monitoring/batcheditexternalalarms
    ///     {
    ///        "alarmId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "added": [
    ///          {
    ///            "itemId": "550e8400-e29b-41d4-a716-446655440010",
    ///            "value": true,
    ///            "isDisabled": false
    ///          },
    ///          {
    ///            "itemId": "550e8400-e29b-41d4-a716-446655440011",
    ///            "value": false,
    ///            "isDisabled": false
    ///          }
    ///        ],
    ///        "changed": [
    ///          {
    ///            "id": "550e8400-e29b-41d4-a716-446655440020",
    ///            "itemId": "550e8400-e29b-41d4-a716-446655440012",
    ///            "value": true,
    ///            "isDisabled": false
    ///          }
    ///        ],
    ///        "removed": [
    ///          {
    ///            "id": "550e8400-e29b-41d4-a716-446655440030"
    ///          }
    ///        ]
    ///     }
    ///     
    /// Sample request with only additions (no updates or deletions):
    /// 
    ///     POST /api/monitoring/batcheditexternalalarms
    ///     {
    ///        "alarmId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "added": [
    ///          {
    ///            "itemId": "550e8400-e29b-41d4-a716-446655440010",
    ///            "value": true,
    ///            "isDisabled": false
    ///          }
    ///        ],
    ///        "changed": [],
    ///        "removed": []
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Batch operation completed successfully with operation counts</response>
    /// <response code="400">Validation error - invalid request format, missing required fields, or referenced items/alarms not found</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="404">Parent alarm, target item, or external alarm not found</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("BatchEditExternalAlarms")]
    [ProducesResponseType(typeof(BatchEditExternalAlarmsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(BatchEditExternalAlarmsResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(BatchEditExternalAlarmsResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(BatchEditExternalAlarmsResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> BatchEditExternalAlarms([FromBody] BatchEditExternalAlarmsRequestDto request)
    {
        try
        {
            _logger.LogInformation("BatchEditExternalAlarms operation started: AlarmId={AlarmId}, AddCount={AddCount}, UpdateCount={UpdateCount}, DeleteCount={DeleteCount}",
                request?.AlarmId, request?.Added?.Count ?? 0, request?.Changed?.Count ?? 0, request?.Removed?.Count ?? 0);

            // Validate request
            if (request == null)
            {
                _logger.LogWarning("BatchEditExternalAlarms failed: Request is null");
                return BadRequest(new BatchEditExternalAlarmsResponseDto
                {
                    Success = false,
                    Message = "Request body is required"
                });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("BatchEditExternalAlarms failed: User not authenticated");
                return Unauthorized(new { success = false, message = "Authentication required" });
            }

            // Check ModelState
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                _logger.LogWarning("BatchEditExternalAlarms validation failed: UserId={UserId}, Errors={Errors}",
                    userId, string.Join(", ", errors));

                return BadRequest(new BatchEditExternalAlarmsResponseDto
                {
                    Success = false,
                    Message = $"Validation failed: {string.Join(", ", errors)}"
                });
            }

            if (!Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogWarning("BatchEditExternalAlarms failed: Invalid user ID format - UserId={UserId}", userId);
                return BadRequest(new BatchEditExternalAlarmsResponseDto
                {
                    Success = false,
                    Message = "Invalid user ID format"
                });
            }

            // Validate parent alarm exists
            var parentAlarm = await Core.Alarms.GetAlarm(request.AlarmId);
            if (parentAlarm == null)
            {
                _logger.LogWarning("BatchEditExternalAlarms failed: Parent alarm not found - AlarmId={AlarmId}, UserId={UserId}",
                    request.AlarmId, userId);

                return NotFound(new BatchEditExternalAlarmsResponseDto
                {
                    Success = false,
                    Message = $"Parent alarm with ID {request.AlarmId} not found"
                });
            }

            // Get existing external alarms for this parent alarm
            var existingExternalAlarms = await Core.Alarms.GetExternalAlarms(ea => ea.AlarmId == request.AlarmId);

            // Prepare lists for batch operation
            List<ExternalAlarm> listAdd = new();
            List<ExternalAlarm> listUpdate = new();
            List<ExternalAlarm> listDelete = new();

            // Process additions
            foreach (var addDto in request.Added)
            {
                // Validate target item exists
                var targetItem = await Core.Points.GetPoint(addDto.ItemId);
                if (targetItem == null)
                {
                    _logger.LogWarning("BatchEditExternalAlarms failed: Target item not found for addition - ItemId={ItemId}, UserId={UserId}",
                        addDto.ItemId, userId);

                    return NotFound(new BatchEditExternalAlarmsResponseDto
                    {
                        Success = false,
                        Message = $"Target item with ID {addDto.ItemId} not found"
                    });
                }

                var newExternalAlarm = new ExternalAlarm
                {
                    Id = Guid.NewGuid(),
                    AlarmId = request.AlarmId,
                    ItemId = addDto.ItemId,
                    Value = addDto.Value,
                    IsDisabled = addDto.IsDisabled
                };

                listAdd.Add(newExternalAlarm);

                _logger.LogDebug("Prepared external alarm for addition: Id={Id}, AlarmId={AlarmId}, ItemId={ItemId}, Value={Value}, IsDisabled={IsDisabled}",
                    newExternalAlarm.Id, newExternalAlarm.AlarmId, newExternalAlarm.ItemId, newExternalAlarm.Value, newExternalAlarm.IsDisabled);
            }

            // Process updates
            foreach (var changeDto in request.Changed)
            {
                if (!changeDto.Id.HasValue)
                {
                    _logger.LogWarning("BatchEditExternalAlarms failed: Update item missing ID - UserId={UserId}", userId);
                    return BadRequest(new BatchEditExternalAlarmsResponseDto
                    {
                        Success = false,
                        Message = "External alarm ID is required for update operations"
                    });
                }

                var existingAlarm = existingExternalAlarms.FirstOrDefault(ea => ea.Id == changeDto.Id.Value);
                if (existingAlarm == null)
                {
                    _logger.LogWarning("BatchEditExternalAlarms failed: External alarm not found for update - Id={Id}, UserId={UserId}",
                        changeDto.Id.Value, userId);

                    return NotFound(new BatchEditExternalAlarmsResponseDto
                    {
                        Success = false,
                        Message = $"External alarm with ID {changeDto.Id.Value} not found"
                    });
                }

                // Validate target item exists
                var targetItem = await Core.Points.GetPoint(changeDto.ItemId);
                if (targetItem == null)
                {
                    _logger.LogWarning("BatchEditExternalAlarms failed: Target item not found for update - ItemId={ItemId}, UserId={UserId}",
                        changeDto.ItemId, userId);

                    return NotFound(new BatchEditExternalAlarmsResponseDto
                    {
                        Success = false,
                        Message = $"Target item with ID {changeDto.ItemId} not found"
                    });
                }

                // Update properties
                existingAlarm.ItemId = changeDto.ItemId;
                existingAlarm.Value = changeDto.Value;
                existingAlarm.IsDisabled = changeDto.IsDisabled;

                listUpdate.Add(existingAlarm);

                _logger.LogDebug("Prepared external alarm for update: Id={Id}, ItemId={ItemId}, Value={Value}, IsDisabled={IsDisabled}",
                    existingAlarm.Id, existingAlarm.ItemId, existingAlarm.Value, existingAlarm.IsDisabled);
            }

            // Process deletions
            foreach (var removeDto in request.Removed)
            {
                if (!removeDto.Id.HasValue)
                {
                    _logger.LogWarning("BatchEditExternalAlarms failed: Delete item missing ID - UserId={UserId}", userId);
                    return BadRequest(new BatchEditExternalAlarmsResponseDto
                    {
                        Success = false,
                        Message = "External alarm ID is required for delete operations"
                    });
                }

                var existingAlarm = existingExternalAlarms.FirstOrDefault(ea => ea.Id == removeDto.Id.Value);
                if (existingAlarm == null)
                {
                    _logger.LogWarning("BatchEditExternalAlarms failed: External alarm not found for deletion - Id={Id}, UserId={UserId}",
                        removeDto.Id.Value, userId);

                    return NotFound(new BatchEditExternalAlarmsResponseDto
                    {
                        Success = false,
                        Message = $"External alarm with ID {removeDto.Id.Value} not found"
                    });
                }

                listDelete.Add(existingAlarm);

                _logger.LogDebug("Prepared external alarm for deletion: Id={Id}, ItemId={ItemId}",
                    existingAlarm.Id, existingAlarm.ItemId);
            }

            // Execute batch operation
            _logger.LogInformation("Executing batch external alarm operations: Add={AddCount}, Update={UpdateCount}, Delete={DeleteCount}",
                listAdd.Count, listUpdate.Count, listDelete.Count);

            // Process additions
            foreach (var externalAlarm in listAdd)
            {
                var result = await Core.Alarms.AddExternalAlarm(externalAlarm);
                if (!result)
                {
                    _logger.LogError("BatchEditExternalAlarms failed: Could not add external alarm - Id={Id}, AlarmId={AlarmId}",
                        externalAlarm.Id, externalAlarm.AlarmId);

                    return StatusCode(StatusCodes.Status500InternalServerError, new BatchEditExternalAlarmsResponseDto
                    {
                        Success = false,
                        Message = "Failed to add external alarm"
                    });
                }
            }

            // Process updates
            foreach (var externalAlarm in listUpdate)
            {
                var result = await Core.Alarms.UpdateExternalAlarm(externalAlarm);
                if (!result)
                {
                    _logger.LogError("BatchEditExternalAlarms failed: Could not update external alarm - Id={Id}",
                        externalAlarm.Id);

                    return StatusCode(StatusCodes.Status500InternalServerError, new BatchEditExternalAlarmsResponseDto
                    {
                        Success = false,
                        Message = "Failed to update external alarm"
                    });
                }
            }

            // Process deletions
            foreach (var externalAlarm in listDelete)
            {
                var result = await Core.Alarms.RemoveExternalAlarm(externalAlarm);
                if (!result)
                {
                    _logger.LogError("BatchEditExternalAlarms failed: Could not delete external alarm - Id={Id}",
                        externalAlarm.Id);

                    return StatusCode(StatusCodes.Status500InternalServerError, new BatchEditExternalAlarmsResponseDto
                    {
                        Success = false,
                        Message = "Failed to delete external alarm"
                    });
                }
            }

            // Create audit log entries
            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

            if (listAdd.Count > 0)
            {
                var addedData = listAdd.Select(ea => new
                {
                    Id = ea.Id,
                    AlarmId = ea.AlarmId,
                    ItemId = ea.ItemId,
                    Value = ea.Value,
                    IsDisabled = ea.IsDisabled
                }).ToList();

                await _auditService.LogAsync(
                    LogType.AddAlarm,
                    new { Operation = "BatchAddExternalAlarms", ExternalAlarms = addedData, Count = listAdd.Count },
                    itemId: request.AlarmId,
                    userId: userGuid
                );
            }

            if (listUpdate.Count > 0)
            {
                var updatedData = listUpdate.Select(ea => new
                {
                    Id = ea.Id,
                    AlarmId = ea.AlarmId,
                    ItemId = ea.ItemId,
                    Value = ea.Value,
                    IsDisabled = ea.IsDisabled
                }).ToList();

                await _auditService.LogAsync(
                    LogType.EditAlarm,
                    new { Operation = "BatchUpdateExternalAlarms", ExternalAlarms = updatedData, Count = listUpdate.Count },
                    itemId: request.AlarmId,
                    userId: userGuid
                );
            }

            if (listDelete.Count > 0)
            {
                var deletedData = listDelete.Select(ea => new
                {
                    Id = ea.Id,
                    AlarmId = ea.AlarmId,
                    ItemId = ea.ItemId
                }).ToList();

                await _auditService.LogAsync(
                    LogType.DeleteAlarm,
                    new { Operation = "BatchDeleteExternalAlarms", ExternalAlarms = deletedData, Count = listDelete.Count },
                    itemId: request.AlarmId,
                    userId: userGuid
                );
            }

            _logger.LogInformation("BatchEditExternalAlarms operation completed successfully: AlarmId={AlarmId}, Added={AddCount}, Updated={UpdateCount}, Deleted={DeleteCount}, UserId={UserId}",
                request.AlarmId, listAdd.Count, listUpdate.Count, listDelete.Count, userId);

            var successMessage = $"Batch edit external alarms completed successfully: {listAdd.Count} added, {listUpdate.Count} updated, {listDelete.Count} deleted";

            return Ok(new BatchEditExternalAlarmsResponseDto
            {
                Success = true,
                Message = successMessage,
                AddedCount = listAdd.Count,
                UpdatedCount = listUpdate.Count,
                DeletedCount = listDelete.Count
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "BatchEditExternalAlarms validation error: AlarmId={AlarmId}",
                request?.AlarmId);

            return BadRequest(new BatchEditExternalAlarmsResponseDto
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "BatchEditExternalAlarms unauthorized: AlarmId={AlarmId}", request?.AlarmId);
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "BatchEditExternalAlarms error: AlarmId={AlarmId}, Message={Message}",
                request?.AlarmId, ex.Message);

            return StatusCode(StatusCodes.Status500InternalServerError, new BatchEditExternalAlarmsResponseDto
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    // ==================== Modbus Gateway API Endpoints ====================

    /// <summary>
    /// Get all Modbus gateway configurations with their status
    /// </summary>
    /// <returns>List of all Modbus gateway configurations</returns>
    /// <response code="200">Returns the list of gateways</response>
    /// <response code="401">If user is not authenticated</response>
    [HttpPost("GetModbusGateways")]
    [ProducesResponseType(typeof(GetModbusGatewaysResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetModbusGateways()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var gateways = await Core.Controllers.GetModbusGatewayConfigs();
            var response = new GetModbusGatewaysResponseDto();

            foreach (var gateway in gateways)
            {
                var mappings = await Core.Controllers.GetModbusGatewayMappings(gateway.Id);
                
                response.Data.Add(new GetModbusGatewaysResponseDto.ModbusGateway
                {
                    Id = gateway.Id,
                    Name = gateway.Name,
                    ListenIP = gateway.ListenIP,
                    Port = gateway.Port,
                    UnitId = gateway.UnitId,
                    IsEnabled = gateway.IsEnabled,
                    ConnectedClients = gateway.ConnectedClients,
                    LastReadTime = gateway.LastReadTime,
                    LastWriteTime = gateway.LastWriteTime,
                    MappingCount = mappings.Count,
                    CoilCount = mappings.Count(m => m.RegisterType == ModbusRegisterType.Coil),
                    DiscreteInputCount = mappings.Count(m => m.RegisterType == ModbusRegisterType.DiscreteInput),
                    HoldingRegisterCount = mappings.Count(m => m.RegisterType == ModbusRegisterType.HoldingRegister),
                    InputRegisterCount = mappings.Count(m => m.RegisterType == ModbusRegisterType.InputRegister)
                });
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error getting Modbus gateways");
            return BadRequest(new { success = false, errorMessage = "An error occurred while getting gateways" });
        }
    }

    /// <summary>
    /// Add a new Modbus gateway configuration
    /// </summary>
    /// <param name="request">Gateway configuration to add</param>
    /// <returns>Result with the new gateway ID or validation errors</returns>
    /// <response code="200">Returns success status and gateway ID</response>
    /// <response code="401">If user is not authenticated</response>
    [HttpPost("AddModbusGateway")]
    [ProducesResponseType(typeof(AddModbusGatewayResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> AddModbusGateway([FromBody] AddModbusGatewayRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var validationErrors = new List<GatewayValidationError>();

            // Check if port is available in database
            var isPortAvailableInDb = await Core.Controllers.IsPortAvailableInDb(request.Port);
            if (!isPortAvailableInDb)
            {
                validationErrors.Add(GatewayValidationError.PortConflictInDb(request.Port));
            }

            // Check if port is available on the system
            if (isPortAvailableInDb && !GatewayValidationHelper.IsPortAvailableOnSystem(request.Port, request.ListenIP))
            {
                validationErrors.Add(GatewayValidationError.PortInUseOnSystem(request.Port));
            }

            if (validationErrors.Count > 0)
            {
                return Ok(new AddModbusGatewayResponseDto
                {
                    IsSuccessful = false,
                    ErrorMessage = "Validation failed",
                    ValidationErrors = validationErrors
                });
            }

            var gatewayConfig = new Core.Models.ModbusGatewayConfig
            {
                Name = request.Name,
                ListenIP = request.ListenIP,
                Port = request.Port,
                UnitId = request.UnitId,
                IsEnabled = request.IsEnabled
            };

            var gatewayId = await Core.Controllers.AddModbusGatewayConfig(gatewayConfig);

            // Publish config changed message
            await _bus.Publish(new GatewayConfigChangedMessage(gatewayId, GatewayConfigChangeType.Added));

            _logger.LogInformation("Modbus gateway added: {GatewayId}, Name={Name}, Port={Port}, by UserId={UserId}",
                gatewayId, request.Name, request.Port, userId);

            return Ok(new AddModbusGatewayResponseDto
            {
                IsSuccessful = true,
                GatewayId = gatewayId
            });
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error adding Modbus gateway");
            return Ok(new AddModbusGatewayResponseDto
            {
                IsSuccessful = false,
                ErrorMessage = "An error occurred while adding the gateway"
            });
        }
    }

    /// <summary>
    /// Edit an existing Modbus gateway configuration
    /// </summary>
    /// <param name="request">Updated gateway configuration</param>
    /// <returns>Result indicating success or validation errors</returns>
    /// <response code="200">Returns success status</response>
    /// <response code="401">If user is not authenticated</response>
    [HttpPost("EditModbusGateway")]
    [ProducesResponseType(typeof(EditModbusGatewayResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> EditModbusGateway([FromBody] EditModbusGatewayRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var validationErrors = new List<GatewayValidationError>();

            // Get existing gateway to check for port changes
            var existingGateway = await Core.Controllers.GetModbusGatewayConfig(request.Id);
            if (existingGateway == null)
            {
                return Ok(new EditModbusGatewayResponseDto
                {
                    IsSuccessful = false,
                    ErrorMessage = "Gateway not found"
                });
            }

            // Only validate port if it changed
            if (existingGateway.Port != request.Port)
            {
                var isPortAvailableInDb = await Core.Controllers.IsPortAvailableInDb(request.Port, request.Id);
                if (!isPortAvailableInDb)
                {
                    validationErrors.Add(GatewayValidationError.PortConflictInDb(request.Port));
                }

                if (isPortAvailableInDb && !GatewayValidationHelper.IsPortAvailableOnSystem(request.Port, request.ListenIP))
                {
                    validationErrors.Add(GatewayValidationError.PortInUseOnSystem(request.Port));
                }
            }

            if (validationErrors.Count > 0)
            {
                return Ok(new EditModbusGatewayResponseDto
                {
                    IsSuccessful = false,
                    ErrorMessage = "Validation failed",
                    ValidationErrors = validationErrors
                });
            }

            var gatewayConfig = new Core.Models.ModbusGatewayConfig
            {
                Id = request.Id,
                Name = request.Name,
                ListenIP = request.ListenIP,
                Port = request.Port,
                UnitId = request.UnitId,
                IsEnabled = request.IsEnabled
            };

            var result = await Core.Controllers.EditModbusGatewayConfig(gatewayConfig);

            if (result)
            {
                // Publish config changed message
                await _bus.Publish(new GatewayConfigChangedMessage(request.Id, GatewayConfigChangeType.Updated));

                _logger.LogInformation("Modbus gateway edited: {GatewayId}, by UserId={UserId}", request.Id, userId);
            }

            return Ok(new EditModbusGatewayResponseDto
            {
                IsSuccessful = result,
                ErrorMessage = result ? null : "Failed to update gateway"
            });
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error editing Modbus gateway");
            return Ok(new EditModbusGatewayResponseDto
            {
                IsSuccessful = false,
                ErrorMessage = "An error occurred while editing the gateway"
            });
        }
    }

    /// <summary>
    /// Delete a Modbus gateway configuration
    /// </summary>
    /// <param name="request">Request containing the gateway ID to delete</param>
    /// <returns>Result indicating success or failure</returns>
    /// <response code="200">Returns success status</response>
    /// <response code="401">If user is not authenticated</response>
    [HttpPost("DeleteModbusGateway")]
    [ProducesResponseType(typeof(DeleteModbusGatewayResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeleteModbusGateway([FromBody] DeleteModbusGatewayRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await Core.Controllers.DeleteModbusGatewayConfig(request.Id);

            if (result)
            {
                // Publish config changed message
                await _bus.Publish(new GatewayConfigChangedMessage(request.Id, GatewayConfigChangeType.Deleted));

                _logger.LogInformation("Modbus gateway deleted: {GatewayId}, by UserId={UserId}", request.Id, userId);
            }

            return Ok(new DeleteModbusGatewayResponseDto
            {
                IsSuccessful = result,
                ErrorMessage = result ? null : "Gateway not found or could not be deleted"
            });
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error deleting Modbus gateway");
            return Ok(new DeleteModbusGatewayResponseDto
            {
                IsSuccessful = false,
                ErrorMessage = "An error occurred while deleting the gateway"
            });
        }
    }

    /// <summary>
    /// Get all mappings for a specific Modbus gateway
    /// </summary>
    /// <param name="request">Request containing the gateway ID</param>
    /// <returns>List of mappings with item details</returns>
    /// <response code="200">Returns the list of mappings</response>
    /// <response code="401">If user is not authenticated</response>
    [HttpPost("GetModbusGatewayMappings")]
    [ProducesResponseType(typeof(GetModbusGatewayMappingsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetModbusGatewayMappings([FromBody] GetModbusGatewayMappingsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var mappings = await Core.Controllers.GetGatewayMappingsWithItems(request.GatewayId);
            var response = new GetModbusGatewayMappingsResponseDto
            {
                IsSuccessful = true,
                Mappings = mappings.Select(m => new ModbusGatewayMappingDto
                {
                    Id = m.Id,
                    GatewayId = m.GatewayId,
                    ModbusAddress = m.ModbusAddress,
                    RegisterType = (int)m.RegisterType,
                    ItemId = m.ItemId,
                    ItemName = m.Item?.ItemName,
                    ItemNameFa = m.Item?.ItemNameFa,
                    IsEditable = m.Item?.IsEditable ?? false,
                    RegisterCount = m.RegisterCount,
                    DataRepresentation = (int)m.DataRepresentation,
                    Endianness = (int)m.Endianness,
                    ScaleMin = m.ScaleMin,
                    ScaleMax = m.ScaleMax
                }).ToList()
            };

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error getting Modbus gateway mappings");
            return Ok(new GetModbusGatewayMappingsResponseDto
            {
                IsSuccessful = false,
                ErrorMessage = "An error occurred while getting mappings"
            });
        }
    }

    /// <summary>
    /// Batch edit mappings for a Modbus gateway (add, update, remove in single transaction)
    /// </summary>
    /// <param name="request">Batch edit request with added, updated, and removed mappings</param>
    /// <returns>Result indicating success or validation errors for overlaps</returns>
    /// <response code="200">Returns success status or validation errors</response>
    /// <response code="401">If user is not authenticated</response>
    [HttpPost("BatchEditModbusGatewayMappings")]
    [ProducesResponseType(typeof(BatchEditModbusGatewayMappingsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> BatchEditModbusGatewayMappings([FromBody] BatchEditModbusGatewayMappingsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // Get existing mappings
            var existingMappings = await Core.Controllers.GetModbusGatewayMappings(request.GatewayId);
            
            // Build the complete set of mappings after changes for overlap validation
            var allMappingsAfterEdit = new List<MappingRange>();

            // Add existing mappings that are not being removed or updated
            var removedIds = new HashSet<Guid>(request.RemovedIds);
            var updatedIds = new HashSet<Guid>(request.Updated.Where(u => u.Id.HasValue).Select(u => u.Id!.Value));
            
            foreach (var existing in existingMappings)
            {
                if (!removedIds.Contains(existing.Id) && !updatedIds.Contains(existing.Id))
                {
                    allMappingsAfterEdit.Add(new MappingRange
                    {
                        MappingId = existing.Id,
                        StartAddress = existing.ModbusAddress,
                        RegisterCount = existing.RegisterCount,
                        RegisterType = (int)existing.RegisterType
                    });
                }
            }

            // Add new mappings
            foreach (var added in request.Added)
            {
                var registerCount = GatewayValidationHelper.CalculateRegisterCount((Core.Libs.ModbusDataRepresentation)added.DataRepresentation);
                allMappingsAfterEdit.Add(new MappingRange
                {
                    MappingId = Guid.NewGuid(),
                    StartAddress = added.ModbusAddress,
                    RegisterCount = registerCount,
                    RegisterType = added.RegisterType
                });
            }

            // Add updated mappings
            foreach (var updated in request.Updated)
            {
                var registerCount = GatewayValidationHelper.CalculateRegisterCount((Core.Libs.ModbusDataRepresentation)updated.DataRepresentation);
                allMappingsAfterEdit.Add(new MappingRange
                {
                    MappingId = updated.Id ?? Guid.NewGuid(),
                    StartAddress = updated.ModbusAddress,
                    RegisterCount = registerCount,
                    RegisterType = updated.RegisterType
                });
            }

            // Validate for overlaps
            var validationErrors = GatewayValidationHelper.ValidateMappingOverlaps(allMappingsAfterEdit);
            if (validationErrors.Count > 0)
            {
                return Ok(new BatchEditModbusGatewayMappingsResponseDto
                {
                    IsSuccessful = false,
                    ErrorMessage = "Mapping address ranges overlap",
                    ValidationErrors = validationErrors
                });
            }

            // Convert DTOs to entities
            var listAdd = request.Added.Select(m => new Core.Models.ModbusGatewayMapping
            {
                GatewayId = request.GatewayId,
                ModbusAddress = m.ModbusAddress,
                RegisterType = (Core.Libs.ModbusRegisterType)m.RegisterType,
                ItemId = m.ItemId,
                RegisterCount = GatewayValidationHelper.CalculateRegisterCount((Core.Libs.ModbusDataRepresentation)m.DataRepresentation),
                DataRepresentation = (Core.Libs.ModbusDataRepresentation)m.DataRepresentation,
                Endianness = (Core.Libs.Endianness)m.Endianness,
                ScaleMin = m.ScaleMin,
                ScaleMax = m.ScaleMax
            }).ToList();

            var listUpdate = request.Updated.Where(m => m.Id.HasValue).Select(m => new Core.Models.ModbusGatewayMapping
            {
                Id = m.Id!.Value,
                GatewayId = request.GatewayId,
                ModbusAddress = m.ModbusAddress,
                RegisterType = (Core.Libs.ModbusRegisterType)m.RegisterType,
                ItemId = m.ItemId,
                RegisterCount = GatewayValidationHelper.CalculateRegisterCount((Core.Libs.ModbusDataRepresentation)m.DataRepresentation),
                DataRepresentation = (Core.Libs.ModbusDataRepresentation)m.DataRepresentation,
                Endianness = (Core.Libs.Endianness)m.Endianness,
                ScaleMin = m.ScaleMin,
                ScaleMax = m.ScaleMax
            }).ToList();

            var listRemove = existingMappings.Where(m => removedIds.Contains(m.Id)).ToList();

            var result = await Core.Controllers.BatchEditModbusGatewayMappings(listAdd, listUpdate, listRemove);

            if (result)
            {
                // Publish config changed message to reload mappings in worker
                await _bus.Publish(new GatewayConfigChangedMessage(request.GatewayId, GatewayConfigChangeType.Updated));

                _logger.LogInformation("Modbus gateway mappings batch edited: GatewayId={GatewayId}, Added={AddCount}, Updated={UpdateCount}, Removed={RemoveCount}, by UserId={UserId}",
                    request.GatewayId, listAdd.Count, listUpdate.Count, listRemove.Count, userId);
            }

            return Ok(new BatchEditModbusGatewayMappingsResponseDto
            {
                IsSuccessful = result,
                ErrorMessage = result ? null : "Failed to update mappings"
            });
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error batch editing Modbus gateway mappings");
            return Ok(new BatchEditModbusGatewayMappingsResponseDto
            {
                IsSuccessful = false,
                ErrorMessage = "An error occurred while updating mappings"
            });
        }
    }
}