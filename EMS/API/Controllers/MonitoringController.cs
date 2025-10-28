using System.Security.Claims;
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

    /// <summary>
    /// Initializes a new instance of the MonitoringController
    /// </summary>
    /// <param name="userManager">The user manager service</param>
    /// <param name="context">The application database context</param>
    /// <param name="logger">The logger service</param>
    /// <param name="httpContextAccessor">The HTTP context accessor</param>
    /// <param name="bus">The MassTransit bus service</param>
    /// <param name="auditService">The audit service for logging operations</param>
    public MonitoringController(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context,
        ILogger<MonitoringController> logger,
        IHttpContextAccessor httpContextAccessor,
        IBus bus,
        IAuditService auditService)
    {
        _userManager = userManager;
        _context = context;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
        _bus = bus;
        _auditService = auditService;
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
                            IsDisabled = item.IsDisabled,
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
                                IsDisabled = item.IsDisabled,
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
                                IsDisabled = item.IsDisabled,
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
                                    IsDisabled = item.IsDisabled,
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
    /// Get all monitoring items with admin privileges (bypasses user permissions)
    /// </summary>
    /// <param name="request">Items request parameters including ShowOrphans flag to control orphaned items visibility</param>
    /// <returns>List of all monitoring items in the system regardless of user permissions</returns>
    /// <remarks>
    /// This endpoint bypasses user group permissions and returns all items in the system.
    /// The ShowOrphans parameter determines whether items not assigned to any group should be included.
    /// </remarks>
    /// <response code="200">Returns the complete list of monitoring items</response>
    /// <response code="400">If there's a validation error with the request</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("ItemsAsAdmin")]
    [ProducesResponseType(typeof(ItemsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ItemsAsAdmin([FromBody] ItemsRequestDto request)
    {
        try
        {
            var items = (await Core.Points.ListPoints()).OrderBy(x => x.ItemName);
            var groupItems = await _context.GroupItems.ToListAsync();

            var permittedItems = new List<ItemsResponseDto.Item>();

            foreach (var item in items)
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
                        ItemType = (Share.Libs.ItemType)item.ItemType,
                        GroupId = groupId,
                        OnText = item.OnText,
                        OffText = item.OffText,
                        Unit = item.Unit,
                        CalculationMethod = (Share.Libs.ValueCalculationMethod)item.CalculationMethod,
                        NumberOfSamples = item.NumberOfSamples,
                        IsDisabled = item.IsDisabled,
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
                            ItemType = (Share.Libs.ItemType)item.ItemType,
                            GroupId = groupItem.GroupId.ToString(),
                            OnText = item.OnText,
                            OffText = item.OffText,
                            Unit = item.Unit,
                            CalculationMethod = (Share.Libs.ValueCalculationMethod)item.CalculationMethod,
                            NumberOfSamples = item.NumberOfSamples,
                            IsDisabled = item.IsDisabled,
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

            var response = new ItemsResponseDto()
            {
                Items = permittedItems,
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
    /// <returns>System version and user-specific version information</returns>
    /// <response code="200">Returns the version information</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's an error retrieving version information</response>
    [HttpGet("SettingsVersion")]
    [ProducesResponseType(typeof(SettingsVersionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SettingsVersion()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var userGuid = Guid.Parse(userId);
            var version = (await Core.Settings.GetVersion()).ToString();
            var userVersion = await _context.UserVersions.FirstOrDefaultAsync(x => x.UserId == userGuid);

            var response = new SettingsVersionResponseDto()
            {
                Version = version,
                UserVersion = userVersion?.Version,
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

// Register client method to receive updates
connection.on('ReceiveActiveAlarmsUpdate', (activeAlarmsCount) => {
    console.log(`Active alarms: ${activeAlarmsCount}`);
    document.getElementById('alarmCount').textContent = activeAlarmsCount;
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

// Register client method to receive updates
connection.On<int>(""ReceiveActiveAlarmsUpdate"", (activeAlarmsCount) =>
{
    Console.WriteLine($""Active alarms: {activeAlarmsCount}"");
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

# Register client method to receive updates
hub_connection.on(""ReceiveActiveAlarmsUpdate"", lambda activeAlarmsCount: 
    print(f""Active alarms: {activeAlarmsCount}""))

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
    /// Get historical alarm data for specified monitoring items within a date range
    /// </summary>
    /// <param name="request">Alarm history request containing start date (Unix timestamp), end date (Unix timestamp), and optional item IDs</param>
    /// <returns>Historical alarm events for the specified time period and items</returns>
    /// <remarks>
    /// Retrieves historical alarm events within the specified date range. If itemIds is provided,
    /// only returns alarms for those specific items. Otherwise, returns all alarms in the system.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/monitoring/historyalarms
    ///     {
    ///        "startDate": 1697587200,
    ///        "endDate": 1697673600,
    ///        "itemIds": ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]
    ///     }
    ///     
    /// Leave itemIds empty or null to retrieve all alarms in the system for the date range.
    /// Dates are Unix timestamps (seconds since epoch).
    /// </remarks>
    /// <response code="200">Returns the historical alarm data with success status</response>
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

            _logger.LogDebug("Fetching alarm history: StartDate={StartDate}, EndDate={EndDate}, ItemCount={ItemCount}", 
                request.StartDate, request.EndDate, request.ItemIds?.Count ?? 0);

            // Retrieve alarm history from Core
            var alarms = await Core.Alarms.HistoryAlarms(request.StartDate, request.EndDate, request.ItemIds);

            // Build response
            var response = new AlarmHistoryResponseDto();

            foreach (var a in alarms)
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

            _logger.LogInformation("HistoryAlarms completed successfully: User {UserId}, AlarmCount={AlarmCount}", 
                User.Identity?.Name, response.Data.Count);

            return Ok(response);
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
    /// <param name="request">Edit alarm request containing alarm ID and updated properties</param>
    /// <returns>Result indicating success or failure of the alarm edit operation</returns>
    /// <response code="200">Returns success status of the alarm edit operation</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("EditAlarm")]
    [ProducesResponseType(typeof(EditAlarmResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> EditAlarm([FromBody] EditAlarmRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var userGuid = Guid.Parse(userId);

            var response = new EditAlarmResponseDto()
            {
                IsSuccessful = false,
            };

            var point = await Core.Points.GetPoint(request.ItemId);
            var alarm = await Core.Alarms.GetAlarm(request.Id);

            if (alarm == null)
            {
                return Ok(response);
            }

            // create log

            var logValue = new EditAlarmLog()
            {
                IsDisabledOld = alarm.IsDisabled,
                IsDisabledNew = request.IsDisabled,
                AlarmDelayOld = alarm.AlarmDelay,
                AlarmDelayNew = request.AlarmDelay,
                MessageOld = alarm.Message,
                MessageNew = request.Message,
                Value1Old = alarm.Value1,
                Value1New = request.Value1,
                Value2Old = alarm.Value2,
                Value2New = request.Value2,
                TimeoutOld = alarm.Timeout,
                TimeoutNew = request.Timeout,
            };

            var logValueJson = JsonConvert.SerializeObject(logValue, Formatting.Indented);

            alarm.IsDisabled = request.IsDisabled;
            alarm.AlarmDelay = request.AlarmDelay;
            alarm.Message = request.Message;
            alarm.Value1 = request.Value1;
            alarm.Value2 = request.Value2;
            alarm.Timeout = request.Timeout;

            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();

            var result = await Core.Alarms.EditAlarm(alarm);

            if (result)
            {
                response.IsSuccessful = true;
                var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

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
    /// Get all system users except the admin user
    /// </summary>
    /// <returns>List of all users with their basic information and assigned roles</returns>
    /// <response code="200">Returns the list of system users</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's an error retrieving users</response>
    [HttpGet("GetUsers")]
    [ProducesResponseType(typeof(GetUsersResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetUsers()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // var userGuid = Guid.Parse(userId);

            var users = await _context.Users
                .OrderBy(x => x.LastName)
                .ThenBy(x => x.FirstName)
                .ThenBy(x => x.UserName)
                .ToListAsync();
            var roles = await _context.Roles.ToListAsync();

            var response = new GetUsersResponseDto();

            foreach (var user in users)
            {
                if (user.UserName.ToLower() == "admin")
                {
                    continue;
                }

                var userRoles = await _context.UserRoles
                    .Where(x => x.UserId == user.Id).ToListAsync();

                List<string> userRolesList = [];

                foreach (var u in userRoles)
                {
                    var value = roles.FirstOrDefault(x => x.Id == u.RoleId);
                    userRolesList.Add(value.Name);
                }

                response.Data.Add(new GetUsersResponseDto.User
                {
                    Id = new Guid(user.Id),
                    UserName = user.UserName,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Roles = userRolesList,
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
    /// Create a new user account in the system
    /// </summary>
    /// <param name="request">Add user request containing username, first name, and last name</param>
    /// <returns>Result indicating success or failure of user creation, with error details if applicable</returns>
    /// <response code="200">Returns success status and any validation errors</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("AddUser")]
    [ProducesResponseType(typeof(AddUserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddUser([FromBody] AddUserRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new AddUserResponseDto();

            if (string.IsNullOrEmpty(request.UserName))
            {
                response.IsSuccessful = false;
                response.Error = AddUserResponseDto.AddUserErrorType.EmptyUserName;
                return Ok(response);
            }

            var user = await _userManager.FindByNameAsync(request.UserName);

            if (user == null)
            {
                var identity = new ApplicationUser(request.UserName)
                { FirstName = request.FirstName, LastName = request.LastName };
                var password = "12345";
                var result = await _userManager.CreateAsync(identity, password);

                if (result.Succeeded)
                {
                    response.IsSuccessful = true;
                }
            }
            else
            {
                response.IsSuccessful = false;
                response.Error = AddUserResponseDto.AddUserErrorType.DuplicateUserName;
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
    /// Edit an existing user's account information
    /// </summary>
    /// <param name="request">Edit user request containing updated username, first name, and last name</param>
    /// <returns>Result indicating success or failure of user update operation</returns>
    /// <response code="200">Returns success status and any validation errors</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("EditUser")]
    [ProducesResponseType(typeof(EditUserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> EditUser([FromBody] EditUserRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new EditUserResponseDto();

            if (string.IsNullOrEmpty(request.UserName))
            {
                response.IsSuccessful = false;
                response.Error = EditUserResponseDto.EditUserErrorType.EmptyUserName;
                return Ok(response);
            }

            var user = await _userManager.FindByNameAsync(request.UserName);

            if (user != null)
            {
                user.UserName = request.UserName;
                user.FirstName = request.FirstName;
                user.LastName = request.LastName;

                var result = await _userManager.UpdateAsync(user);

                if (result.Succeeded)
                {
                    response.IsSuccessful = true;
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
    /// Get all available system roles
    /// </summary>
    /// <returns>List of all system roles with their IDs and names</returns>
    /// <response code="200">Returns the list of system roles</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's an error retrieving roles</response>
    [HttpGet("GetRoles")]
    [ProducesResponseType(typeof(GetRolesResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetRoles()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var roles = await _context.Roles.OrderBy(x => x.Name).ToListAsync();

            var response = new GetRolesResponseDto();

            foreach (var role in roles)
            {
                response.Data.Add(new GetRolesResponseDto.Role()
                {
                    Id = new Guid(role.Id),
                    RoleName = role.Name,
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
    /// Assign roles to a specific user
    /// </summary>
    /// <param name="request">Set roles request containing username and list of role names to assign</param>
    /// <returns>Result indicating success or failure of role assignment operation</returns>
    /// <response code="200">Returns success status of the role assignment</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("SetRoles")]
    [ProducesResponseType(typeof(SetRolesResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetRoles([FromBody] SetRolesRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new SetRolesResponseDto();

            if (string.IsNullOrEmpty(request.UserName))
            {
                response.IsSuccessful = false;
                return Ok(response);
            }

            var user = await _userManager.FindByNameAsync(request.UserName);

            if (user != null)
            {
                var currentRoles = await _userManager.GetRolesAsync(user);
                await _userManager.RemoveFromRolesAsync(user, currentRoles);
                await _userManager.AddToRolesAsync(user, request.Roles);
                response.IsSuccessful = true;
            }
            else
            {
                response.IsSuccessful = false;
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
    /// Get detailed information for a specific user
    /// </summary>
    /// <param name="request">Get user request containing the user ID</param>
    /// <returns>User information including name, username, and assigned roles</returns>
    /// <response code="200">Returns the user's detailed information</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("GetUser")]
    [ProducesResponseType(typeof(GetUserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetUser([FromBody] GetUserRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }


            var user = await _context.Users.FirstOrDefaultAsync(x => x.Id == request.UserId);
            var roles = await _context.Roles.ToListAsync();

            var userRoles = await _context.UserRoles
                .Where(x => x.UserId == user.Id).ToListAsync();

            List<string> userRolesList = [];

            foreach (var u in userRoles)
            {
                var value = roles.FirstOrDefault(x => x.Id == u.RoleId);
                userRolesList.Add(value.Name);
            }

            var response = new GetUserResponseDto()
            {
                Id = new Guid(userId),
                UserName = user.UserName,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Roles = userRolesList,
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
    /// Save user permissions for accessing monitoring items
    /// </summary>
    /// <param name="request">Save permissions request containing user ID and list of item permissions</param>
    /// <returns>Result indicating success or failure of permission saving operation</returns>
    /// <remarks>
    /// Updates the user's item permissions by replacing all existing permissions with the new set.
    /// Groups are now accessible to all users, with client-side filtering based on item access.
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
    /// <response code="200">Returns success status of the permission save operation</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request or user not found</response>
    [HttpPost("SavePermissions")]
    [ProducesResponseType(typeof(SavePermissionsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SavePermissions([FromBody] SavePermissionsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            
            if (user == null)
            {
                return BadRequest(new { success = false, message = "User not found" });
            }

            // Remove existing item permissions for the user
            var itemsToDelete = await _context.ItemPermissions
                .Where(x => x.UserId == new Guid(user.Id))
                .ToListAsync();
            _context.ItemPermissions.RemoveRange(itemsToDelete);

            // Add new item permissions
            List<ItemPermission> itemPermissions = new();

            foreach (var i in request.ItemPermissions)
            {
                itemPermissions.Add(new ItemPermission()
                {
                    UserId = new Guid(user.Id),
                    ItemId = new Guid(i),
                });
            }

            await _context.ItemPermissions.AddRangeAsync(itemPermissions);

            var response = new SavePermissionsResponseDto()
            {
                IsSuccessful = true,
            };

            if (user != null)
            {
                var userVersion = await _context.UserVersions.FirstOrDefaultAsync(x => x.UserId == new Guid(user.Id));

                if (userVersion == null)
                {
                    userVersion = new UserVersion()
                    {
                        UserId = new Guid(user.Id),
                        Version = Guid.NewGuid().ToString(),
                    };

                    await _context.UserVersions.AddAsync(userVersion);
                }
                else
                {
                    userVersion.Version = Guid.NewGuid().ToString();
                }

                await _context.SaveChangesAsync();
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
    /// <param name="request">Add alarm request containing alarm configuration details</param>
    /// <returns>Result indicating success or failure of alarm creation</returns>
    /// <response code="200">Returns success status of the alarm creation</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("AddAlarm")]
    public async Task<IActionResult> AddAlarm([FromBody] AddAlarmRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var userGuid = Guid.Parse(userId);

            var response = new AddAlarmResponseDto();

            var result = await Core.Alarms.AddAlarm(new Alarm()
            {
                ItemId = request.ItemId,
                IsDisabled = request.IsDisabled,
                AlarmDelay = request.AlarmDelay,
                Message = request.Message,
                Value1 = request.Value1,
                Value2 = request.Value2,
                Timeout = request.Timeout,
                AlarmType = (Core.Libs.AlarmType)request.AlarmType,
                AlarmPriority = (Core.Libs.AlarmPriority)request.AlarmPriority,
                CompareType = (Core.Libs.CompareType)request.CompareType,
                HasExternalAlarm = false,
            });

            // create log

            var logValue = new AddAlarmLog()
            {
                ItemId = request.ItemId,
                IsDisabled = request.IsDisabled,
                AlarmDelay = request.AlarmDelay,
                Message = request.Message,
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

            if (result != null || result != Guid.Empty)
            {
                response.IsSuccessful = true;
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
    /// Delete an existing alarm configuration
    /// </summary>
    /// <param name="request">Delete alarm request containing the alarm ID</param>
    /// <returns>Result indicating success or failure of alarm deletion</returns>
    /// <response code="200">Returns success status of the alarm deletion</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("DeleteAlarm")]
    public async Task<IActionResult> DeleteAlarm([FromBody] DeleteAlarmRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var userGuid = Guid.Parse(userId);

            var response = new DeleteAlarmResponseDto();

            var result = await Core.Alarms.DeleteAlarm(x => x.Id == request.Id);

            if (result)
            {
                DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
                long epochTime = currentTimeUtc.ToUnixTimeSeconds();

                var alarm = await Core.Alarms.GetAlarm(request.Id);

                // create log

                var logValue = new DeleteAlarmLog()
                {
                    Id = alarm.Id,
                    ItemId = alarm.ItemId,
                    IsDisabled = alarm.IsDisabled,
                    AlarmDelay = alarm.AlarmDelay,
                    Message = alarm.Message,
                    Value1 = alarm.Value1,
                    Value2 = alarm.Value2,
                    Timeout = alarm.Timeout,
                    AlarmType = (Share.Libs.AlarmType)alarm.AlarmType,
                    AlarmPriority = (Share.Libs.AlarmPriority)alarm.AlarmPriority,
                    CompareType = (Share.Libs.CompareType)alarm.CompareType,
                };

                var logValueJson = JsonConvert.SerializeObject(logValue, Formatting.Indented);

                response.IsSuccess = true;
                var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

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
    /// Get external alarm configurations for a specific alarm
    /// </summary>
    /// <param name="request">Get external alarms request containing the alarm ID</param>
    /// <returns>List of external alarms associated with the specified alarm</returns>
    /// <response code="200">Returns the external alarm configurations</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("GetExternalAlarms")]
    public async Task<IActionResult> GetExternalAlarms([FromBody] GetExternalAlarmsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new GetExternalAlarmsResponseDto();

            var alarms = await Core.Alarms.GetExternalAlarms(x => x.AlarmId == request.AlarmId);

            foreach (var externalAlarm in alarms)
            {
                response.ExternalAlarms.Add(new GetExternalAlarmsResponseDto.ExternalAlarm()
                {
                    Id = externalAlarm.Id,
                    AlarmId = externalAlarm.AlarmId,
                    ItemId = externalAlarm.ItemId,
                    Value = externalAlarm.Value,
                    IsDisabled = externalAlarm.IsDisabled,
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
    /// Batch edit external alarm configurations (add, update, delete multiple external alarms in one operation)
    /// </summary>
    /// <param name="request">Batch edit request containing lists of external alarms to add, update, and delete</param>
    /// <returns>Result indicating success or failure of the batch external alarm operation</returns>
    /// <response code="200">Returns success status of the batch external alarm operation</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's a validation error with the request</response>
    [HttpPost("BatchEditExternalAlarms")]
    public async Task<IActionResult> BatchEditExternalAlarms([FromBody] BatchEditExternalAlarmsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var userGuid = Guid.Parse(userId);

            var response = new BatchEditExternalAlarmsResponseDto();
            var externalAlarms = await Core.Alarms.GetExternalAlarms(x => x.AlarmId == request.AlarmId);
            List<ExternalAlarm> listDelete = [];
            List<ExternalAlarm> listAdd = [];
            List<ExternalAlarm> listUpdate = [];

            foreach (var d in request.Removed)
            {
                var data = externalAlarms.FirstOrDefault(x => x.Id == d.Id);
                if (data != null)
                {
                    listDelete.Add(data);
                }
            }

            foreach (var d in request.Added)
            {
                listAdd.Add(new ExternalAlarm()
                {
                    AlarmId = request.AlarmId,
                    ItemId = d.ItemId,
                    Value = d.Value,
                    IsDisabled = d.IsDisabled,
                });
            }

            foreach (var d in request.Changed)
            {
                var data = externalAlarms.FirstOrDefault(x => x.Id == d.Id);
                if (data != null)
                {
                    data.ItemId = d.ItemId;
                    data.Value = d.Value;
                    data.IsDisabled = d.IsDisabled;
                    data.AlarmId = request.AlarmId;

                    listUpdate.Add(data);
                }
            }

            var result = await Core.Alarms.BatchEditExternalAlarms(listAdd, listUpdate, listDelete);

            var list = await Core.Alarms.GetExternalAlarms(x => x.AlarmId == request.AlarmId);

            if (list.Count == 0)
            {
                var alarm = await Core.Alarms.GetAlarm(request.AlarmId);
                if (alarm != null)
                {
                    alarm.HasExternalAlarm = false;
                    await Core.Alarms.EditAlarm(alarm);
                }
            }
            else if (list.Count > 0)
            {
                var alarm = await Core.Alarms.GetAlarm(request.AlarmId);
                if (alarm != null)
                {
                    alarm.HasExternalAlarm = true;
                    await Core.Alarms.EditAlarm(alarm);
                }
            }

            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();

            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

            List<AuditLog> logs = new();

            // add log
            foreach (var externalAlarm in request.Added)
            {
                var alarm = await Core.Alarms.GetAlarm(request.AlarmId);

                // create log

                var logValue = new BatchEditExternalAlarmLog()
                {
                    AlarmId = request.AlarmId,
                    ItemId = externalAlarm.ItemId,
                    Value = externalAlarm.Value,
                    IsDisabled = externalAlarm.IsDisabled,
                };

                var logValueJson = JsonConvert.SerializeObject(logValue, Formatting.Indented);

                logs.Add(new AuditLog()
                {
                    IsUser = true,
                    UserId = userGuid,
                    ItemId = alarm.ItemId,
                    ActionType = LogType.AddExternalAlarm,
                    IpAddress = ipAddress,
                    LogValue = logValueJson,
                    Time = epochTime,
                });
            }

            // delete log
            foreach (var externalAlarm in request.Removed)
            {
                var alarm = await Core.Alarms.GetAlarm(request.AlarmId);

                // create log

                var logValue = new BatchEditExternalAlarmLog()
                {
                    Id = externalAlarm.Id,
                    AlarmId = request.AlarmId,
                    ItemId = externalAlarm.ItemId,
                    Value = externalAlarm.Value,
                    IsDisabled = externalAlarm.IsDisabled,
                };

                var logValueJson = JsonConvert.SerializeObject(logValue, Formatting.Indented);

                logs.Add(new AuditLog()
                {
                    IsUser = true,
                    UserId = userGuid,
                    ItemId = alarm.ItemId,
                    ActionType = LogType.DeleteExternalAlarm,
                    IpAddress = ipAddress,
                    LogValue = logValueJson,
                    Time = epochTime,
                });
            }

            // edit log
            foreach (var externalAlarm in request.Changed)
            {
                var alarm = await Core.Alarms.GetAlarm(request.AlarmId);

                // create log

                var logValue = new BatchEditExternalAlarmLog()
                {
                    Id = externalAlarm.Id,
                    AlarmId = request.AlarmId,
                    ItemId = externalAlarm.ItemId,
                    Value = externalAlarm.Value,
                    IsDisabled = externalAlarm.IsDisabled,
                };

                var logValueJson = JsonConvert.SerializeObject(logValue, Formatting.Indented);

                logs.Add(new AuditLog()
                {
                    IsUser = true,
                    UserId = userGuid,
                    ItemId = alarm.ItemId,
                    ActionType = LogType.EditExternalAlarm,
                    IpAddress = ipAddress,
                    LogValue = logValueJson,
                    Time = epochTime,
                });
            }

            await _context.AuditLogs.AddRangeAsync(logs);
            await _context.SaveChangesAsync();

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
    /// Manually trigger a version update notification to all connected clients via gRPC
    /// </summary>
    /// <returns>Result indicating success or failure of the client update push</returns>
    /// <response code="200">Returns success status of the update push operation</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="400">If there's an error pushing updates to clients</response>
    [HttpGet("PushUpdateAllClients")]
    public async Task<IActionResult> PushUpdateAllClients()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new PushUpdateAllClientsResponse();

            response.Success = true;
            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
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
    /// Sample request:
    /// 
    ///     POST /api/monitoring/writeoraddvalue
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
}