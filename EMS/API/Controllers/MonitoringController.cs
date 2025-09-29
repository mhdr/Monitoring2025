using System.Security.Claims;
using API.Libs;
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
using Share.Client.Dto;
using Share.Client.ModelDto;
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
    private readonly IHubContext<MyHub> _hubContext;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IBus _bus;

    /// <summary>
    /// Initializes a new instance of the MonitoringController
    /// </summary>
    /// <param name="userManager">The user manager service</param>
    /// <param name="context">The application database context</param>
    /// <param name="logger">The logger service</param>
    /// <param name="hubContext">The SignalR hub context</param>
    /// <param name="httpContextAccessor">The HTTP context accessor</param>
    /// <param name="bus">The MassTransit bus service</param>
    public MonitoringController(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context, 
        ILogger<MonitoringController> logger,
        IHubContext<MyHub> hubContext, 
        IHttpContextAccessor httpContextAccessor,
        IBus bus)
    {
        _userManager = userManager;
        _context = context;
        _logger = logger;
        _hubContext = hubContext;
        _httpContextAccessor = httpContextAccessor;
        _bus = bus;
    }

    /// <summary>
    /// Get groups accessible to the current user
    /// </summary>
    /// <param name="request">Groups request parameters</param>
    /// <returns>List of groups the user has access to</returns>
    /// <response code="200">Returns the list of accessible groups</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("Groups")]
    public async Task<IActionResult> Groups([FromBody] GroupsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var userGuid = Guid.Parse(userId);

            var groups = (await _context.Groups.ToListAsync()).OrderBy(x => x.Name);
            var permittdGroups = new List<GroupsResponseDto.Group>();

            var user = await _userManager.FindByIdAsync(userId);

            foreach (var g in groups)
            {
                if (user.UserName.ToLower() == "admin")
                {
                    var parentId = "";
                    if (g.ParentId != null && g.ParentId != Guid.Empty)
                    {
                        parentId = g.ParentId.ToString();

                        if (string.IsNullOrEmpty(parentId))
                        {
                            parentId = "";
                        }
                    }

                    permittdGroups.Add(new GroupsResponseDto.Group()
                    {
                        Id = g.Id.ToString(),
                        Name = g.Name,
                        ParentId = parentId,
                    });
                }
                else
                {
                    var permissions = await _context.GroupPermissions.Where(x => x.UserId == userGuid)
                        .ToListAsync();
                    var permission = permissions.FirstOrDefault(x => x.GroupId == g.Id);

                    if (permission != null)
                    {
                        var parentId = "";
                        if (g.ParentId != null && g.ParentId != Guid.Empty)
                        {
                            parentId = g.ParentId.ToString();

                            if (string.IsNullOrEmpty(parentId))
                            {
                                parentId = "";
                            }
                        }

                        permittdGroups.Add(new GroupsResponseDto.Group()
                        {
                            Id = g.Id.ToString(),
                            Name = g.Name,
                            ParentId = parentId,
                        });
                    }
                }
            }

            var response = new GroupsResponseDto()
            {
                Groups = permittdGroups,
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving groups for user");
            return StatusCode(500, new { success = false, errorMessage = "Internal server error" });
        }
    }

    /// <summary>
    /// Get monitoring items accessible to the current user
    /// </summary>
    /// <param name="request">Items request parameters</param>
    /// <returns>List of monitoring items the user has access to</returns>
    /// <response code="200">Returns the list of accessible monitoring items</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("Items")]
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
                                    InterfaceType =(Share.Libs.InterfaceType)item.InterfaceType,
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

    [HttpPost("ItemsAsAdmin")]
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

    [HttpPost("Values")]
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
                response.Values.Add(new ValuesResponseDto.Value2()
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

    [HttpPost("Value")]
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

            response.Value = new ValueResponseDto.Value2()
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

    [HttpPost("History")]
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

    [HttpPost("Alarms")]
    public async Task<IActionResult> Alarms([FromBody] AlarmsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // var userGuid = Guid.Parse(userId);

            var alarms = await Core.Alarms.ListAlarms(request.ItemIds);

            var response = new AlarmsResponseDto();

            foreach (var a in alarms)
            {
                if (a.IsDeleted.HasValue)
                {
                    if (a.IsDeleted.Value)
                    {
                        continue;
                    }
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
                    Value1 = a.Value1,
                    Value2 = a.Value2,
                    Timeout = a.Timeout,
                    HasExternalAlarm = a.HasExternalAlarm,
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

    [HttpPost("ActiveAlarms")]
    public async Task<IActionResult> ActiveAlarms([FromBody] ActiveAlarmsRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // var userGuid = Guid.Parse(userId);

            var alarms = await Core.Alarms.ActiveAlarms(request.ItemIds);

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

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    [HttpGet("SettingsVersion")]
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

    [HttpPost("HistoryAlarms")]
    public async Task<IActionResult> HistoryAlarms([FromBody] AlarmHistoryRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // var userGuid = Guid.Parse(userId);

            var alarms = await Core.Alarms.HistoryAlarms(request.StartDate, request.EndDate, request.ItemIds);

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

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    [HttpPost("EditPoint")]
    public async Task<IActionResult> EditPoint([FromBody] EditPointRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var userGuid = Guid.Parse(userId);

            var response = new EditPointResponseDto()
            {
                IsSuccessful = false,
            };

            var point = await Core.Points.GetPoint(request.Id);

            if (point == null)
            {
                return Ok(response);
            }

            // create log

            var itemTypeOld = "";
            var itemTypeNew = "";

            if ((int)point.ItemType == (int)ItemType.AnalogInput)
            {
                itemTypeOld = "Analog Input";
            }
            else if ((int)point.ItemType == (int)ItemType.AnalogOutput)
            {
                itemTypeOld = "Analog Output";
            }
            else if ((int)point.ItemType == (int)ItemType.DigitalInput)
            {
                itemTypeOld = "Digital Input";
            }
            else if ((int)point.ItemType == (int)ItemType.DigitalOutput)
            {
                itemTypeOld = "Digital Output";
            }

            if (request.ItemType == Share.Libs.ItemType.AnalogInput)
            {
                itemTypeNew = "Analog Input";
            }
            else if (request.ItemType == Share.Libs.ItemType.AnalogOutput)
            {
                itemTypeNew = "Analog Output";
            }
            else if (request.ItemType == Share.Libs.ItemType.DigitalInput)
            {
                itemTypeNew = "Digital Input";
            }
            else if (request.ItemType == Share.Libs.ItemType.DigitalOutput)
            {
                itemTypeNew = "Digital Output";
            }

            var logValue = new EditPointLog()
            {
                ItemNameOld = point.ItemName,
                ItemNameNew = request.ItemName,
                ItemTypeOld = itemTypeOld,
                ItemTypeNew = itemTypeNew,
                OnTextOld = point.OnText,
                OnTextNew = request.OnText,
                OffTextOld = point.OffText,
                OffTextNew = request.OffText,
                UnitOld = point.Unit,
                UnitNew = request.Unit,
            };

            var logValueJson = JsonConvert.SerializeObject(logValue, Formatting.Indented);

            point.ItemName = request.ItemName;
            point.ItemType = (Core.Libs.ItemType)request.ItemType;
            point.OnText = request.OnText;
            point.OffText = request.OffText;
            point.Unit = request.Unit;

            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();

            var result = await Core.Points.EditPoint(point);

            if (result)
            {
                response.IsSuccessful = true;

                var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

                // update version
                await Core.Settings.Init();
                var version = await Core.Settings.GetVersion();
                await _hubContext.Clients.All.SendAsync("Version", version.ToString());

                await _context.AuditLogs.AddAsync(new AuditLog()
                {
                    IsUser = true,
                    UserId = userGuid,
                    ItemId = request.Id,
                    ActionType = LogType.EditPoint,
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


    [HttpPost("AuditLog")]
    public async Task<IActionResult> AuditLog([FromBody] AuditLogRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            List<AuditLog> logs = null;

            if (string.IsNullOrEmpty(request.ItemId))
            {
                logs = await _context.AuditLogs
                    .Where(x => x.Time >= request.StartDate && x.Time <= request.EndDate)
                    .OrderByDescending(x => x.Time)
                    .ToListAsync();
            }
            else
            {
                Guid itemId = new Guid(request.ItemId);
                logs = await _context.AuditLogs
                    .Where(x => x.ItemId == itemId && x.Time >= request.StartDate && x.Time <= request.EndDate)
                    .OrderByDescending(x => x.Time)
                    .ToListAsync();
            }

            var response = new AuditLogResponseDto();

            foreach (var d in logs)
            {
                string logUserId = "";
                string userName = "";
                if (d.UserId != null)
                {
                    logUserId = d.UserId.ToString();
                    var user = await _context.Users.FirstOrDefaultAsync(x => x.Id == logUserId);
                    userName = user.UserName;
                }

                response.Data.Add(new AuditLogResponseDto.DataDto()
                {
                    Id = d.Id,
                    IsUser = d.IsUser,
                    UserId = d.UserId,
                    UserName = userName ?? "",
                    ItemId = d.ItemId,
                    ActionType = d.ActionType,
                    IpAddress = d.IpAddress,
                    LogValue = d.LogValue,
                    Time = d.Time,
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

    [HttpPost("EditAlarm")]
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

                // update version
                await Core.Settings.Init();
                var version = await Core.Settings.GetVersion();
                await _hubContext.Clients.All.SendAsync("Version", version.ToString());

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

    [HttpGet("GetUsers")]
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

    [HttpPost("AddUser")]
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
                response.Error = AddUserResponseDto.ErrorType.EmptyUserName;
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
                response.Error = AddUserResponseDto.ErrorType.DuplicateUserName;
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    [HttpPost("AddGroup")]
    public async Task<IActionResult> AddGroup([FromBody] AddGroupRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new AddGroupResponseDto();

            await _context.Groups.AddAsync(new Group()
            {
                Name = request.Name,
                ParentId = request.ParentId,
            });

            await _context.SaveChangesAsync();

            response.IsSuccessful = true;

            // update version
            await Core.Settings.Init();
            var version = await Core.Settings.GetVersion();
            await _hubContext.Clients.All.SendAsync("Version", version.ToString());

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    [HttpPost("EditUser")]
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
                response.Error = EditUserResponseDto.ErrorType.EmptyUserName;
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

    [HttpPost("ResetPassword")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new ResetPasswordResponseDto();

            if (string.IsNullOrEmpty(request.UserName))
            {
                response.IsSuccessful = false;
                return Ok(response);
            }

            var user = await _userManager.FindByNameAsync(request.UserName);

            if (user != null)
            {
                var password = "12345";
                var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
                var resetPassResult = await _userManager.ResetPasswordAsync(user, resetToken, password);

                if (resetPassResult.Succeeded)
                {
                    response.IsSuccessful = true;
                }
                else
                {
                    response.IsSuccessful = false;
                }
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


    [HttpGet("GetRoles")]
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

    [HttpPost("SetRoles")]
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

    [HttpPost("GetUser")]
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

    [HttpPost("ChangePassword")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // var user = await _context.Users.FirstOrDefaultAsync(x => x.Id == userId);
            var user = await _userManager.FindByIdAsync(userId);

            if (user == null)
            {
                return Unauthorized();
            }

            var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);

            var response = new ChangePasswordResponseDto()
            {
                IsSuccessful = result.Succeeded,
            };

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    [HttpPost("SavePermissions")]
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

            var groupsToDelete = await _context.GroupPermissions
                .Where(x => x.UserId == new Guid(user.Id))
                .ToListAsync();
            _context.GroupPermissions.RemoveRange(groupsToDelete);

            List<GroupPermission> groupPermissions = new();
            foreach (var g in request.GroupPermissions)
            {
                groupPermissions.Add(new GroupPermission()
                {
                    UserId = new Guid(user.Id),
                    GroupId = new Guid(g),
                });
            }

            var itemsToDelete = await _context.ItemPermissions
                .Where(x => x.UserId == new Guid(user.Id))
                .ToListAsync();
            _context.ItemPermissions.RemoveRange(itemsToDelete);

            List<ItemPermission> itemPermissions = new();

            foreach (var i in request.ItemPermissions)
            {
                itemPermissions.Add(new ItemPermission()
                {
                    UserId = new Guid(user.Id),
                    ItemId = new Guid(i),
                });
            }

            await _context.GroupPermissions.AddRangeAsync(groupPermissions);
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

                await _hubContext.Clients.User(user.Id).SendAsync("UserVersion", userVersion.Version);
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    [HttpPost("EditGroup")]
    public async Task<IActionResult> EditGroup([FromBody] EditGroupRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var userGuid = Guid.Parse(userId);

            var response = new EditPointResponseDto()
            {
                IsSuccessful = false,
            };

            var group = await _context.Groups.FirstOrDefaultAsync(x => x.Id == request.Id);

            var logValue = new EditGroupLog()
            {
                NameOld = group.Name,
                NameNew = request.Name,
            };

            if (group != null)
            {
                group.Name = request.Name;
            }

            await _context.SaveChangesAsync();
            response.IsSuccessful = true;

            var logValueJson = JsonConvert.SerializeObject(logValue, Formatting.Indented);

            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();

            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

            // update version
            await Core.Settings.Init();
            var version = await Core.Settings.GetVersion();
            await _hubContext.Clients.All.SendAsync("Version", version.ToString());

            await _context.AuditLogs.AddAsync(new AuditLog()
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

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    [HttpPost("Controllers")]
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

    [HttpPost("AddController")]
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
                response.Error = DeleteControllerResponseDto.ErrorType.AlreadyInUse;
            }

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    [HttpPost("DeleteGroup")]
    public async Task<IActionResult> DeleteGroup([FromBody] DeleteGroupRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new DeleteGroupResponseDto()
            {
                IsSuccessful = false,
            };
            var foundItem = await _context.GroupItems.AnyAsync(x => x.GroupId == request.Id);

            if (foundItem)
            {
                response.IsSuccessful = false;
            }
            else
            {
                var group = await _context.Groups.FirstOrDefaultAsync(x => x.Id == request.Id);
                if (group != null)
                {
                    _context.Groups.Remove(group);
                    await _context.SaveChangesAsync();
                    response.IsSuccessful = true;
                }
            }

            // update version
            await Core.Settings.Init();
            var version = await Core.Settings.GetVersion();
            await _hubContext.Clients.All.SendAsync("Version", version.ToString());

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }


    [HttpPost("AddPointAsAdmin")]
    public async Task<IActionResult> AddPointAsAdmin([FromBody] AddPointAsAdminRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new AddPointAsAdminResponseDto();

            var matched = await Core.Points.GetPoint(x => x.PointNumber == request.PointNumber);

            if (matched != null)
            {
                response.IsSuccessful = false;
                response.Error = AddPointAsAdminResponseDto.ErrorType.DuplicatePointNumber;
                return Ok(response);
            }

            var result = await Core.Points.AddPoint(new MonitoringItem()
            {
                ItemType = (Core.Libs.ItemType)request.ItemType,
                ItemName = request.ItemName,
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
                OnText = request.OnText,
                OffText = request.OffText,
                Unit = request.Unit,
                IsDisabled = request.IsDisabled,
            });

            if (result == null || result == Guid.Empty)
            {
                response.IsSuccessful = false;
                response.Error = AddPointAsAdminResponseDto.ErrorType.UnKnown;
                return Ok(response);
            }

            // update version
            await Core.Settings.Init();
            var version = await Core.Settings.GetVersion();
            await _hubContext.Clients.All.SendAsync("Version", version.ToString());

            response.IsSuccessful = true;
            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    [HttpPost("DeletePoint")]
    public async Task<IActionResult> DeletePoint([FromBody] DeletePointRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new DeletePointResponseDto()
            {
                IsSuccessful = false,
            };

            var result = await Core.Points.DeletePoint(x => x.Id == request.Id);
            response.IsSuccessful = result;

            // update version
            await Core.Settings.Init();
            var version = await Core.Settings.GetVersion();
            await _hubContext.Clients.All.SendAsync("Version", version.ToString());

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    [HttpPost("EditPointAsAdmin")]
    public async Task<IActionResult> EditPointAsAdmin([FromBody] EditPointAsAdminRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new EditPointAsAdminResponseDto()
            {
                IsSuccessful = false,
            };

            var matchByPointNumber = await Core.Points.GetPoint(x => x.PointNumber == request.PointNumber);

            if (matchByPointNumber != null)
            {
                if (matchByPointNumber.Id != request.Id)
                {
                    response.IsSuccessful = false;
                    response.Error = EditPointAsAdminResponseDto.ErrorType.DuplicatePointNumber;
                    return Ok(response);
                }
            }

            var result = await Core.Points.EditPoint(new MonitoringItem()
            {
                Id = request.Id,
                ItemType = (Core.Libs.ItemType)request.ItemType,
                ItemName = request.ItemName,
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
                OnText = request.OnText,
                OffText = request.OffText,
                Unit = request.Unit,
                IsDisabled = request.IsDisabled,
            });

            // update version
            await Core.Settings.Init();
            var version = await Core.Settings.GetVersion();
            await _hubContext.Clients.All.SendAsync("Version", version.ToString());

            response.IsSuccessful = result;
            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    [HttpPost("MoveGroup")]
    public async Task<IActionResult> MoveGroup([FromBody] MoveGroupRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new MoveGroupResponseDto()
            {
                IsSuccessful = false,
            };

            var group = await _context.Groups.FirstOrDefaultAsync(x => x.Id == request.GroupId);

            if (group != null)
            {
                group.ParentId = request.ParentId;
                await _context.SaveChangesAsync();
                response.IsSuccessful = true;
            }

            // update version
            await Core.Settings.Init();
            var version = await Core.Settings.GetVersion();
            await _hubContext.Clients.All.SendAsync("Version", version.ToString());

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

    [HttpPost("MovePoint")]
    public async Task<IActionResult> MovePoint([FromBody] MovePointRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new MovePointResponseDto()
            {
                IsSuccessful = false,
            };

            var point = await _context.GroupItems.FirstOrDefaultAsync(x => x.ItemId == request.PointId);
            if (point == null)
            {
                point = new GroupItem()
                {
                    ItemId = request.PointId,
                    GroupId = request.ParentId,
                };

                await _context.GroupItems.AddAsync(point);
            }
            else
            {
                point.GroupId = request.ParentId;
            }

            // update version
            await Core.Settings.Init();
            var version = await Core.Settings.GetVersion();
            await _hubContext.Clients.All.SendAsync("Version", version.ToString());

            await _context.SaveChangesAsync();
            response.IsSuccessful = true;
            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

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

                // update version
                await Core.Settings.Init();
                var version = await Core.Settings.GetVersion();
                await _hubContext.Clients.All.SendAsync("Version", version.ToString());

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

                // update version
                await Core.Settings.Init();
                var version = await Core.Settings.GetVersion();
                await _hubContext.Clients.All.SendAsync("Version", version.ToString());

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

            // update version
            await Core.Settings.Init();
            var version = await Core.Settings.GetVersion();
            await _hubContext.Clients.All.SendAsync("Version", version.ToString());

            response.IsSuccess = result;
            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }


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

            // update version
            await Core.Settings.Init();
            var version = await Core.Settings.GetVersion();
            await _hubContext.Clients.All.SendAsync("Version", version.ToString());

            response.Success = true;
            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

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
            var result = await Core.Points.WriteValueToController(request.ItemId, request.Value, request.Time);
            response.IsSuccess = result;

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

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

    [HttpPost("WriteOrAddValue")]
    public async Task<IActionResult> WriteOrAddValue([FromBody] WriteOrAddValueRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var response = new WriteOrAddValueResponseDto();
            var result = await Core.Points.WriteOrAddValue(request.ItemId, request.Value, request.Time);
            response.IsSuccess = result;

            return Ok(response);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }

        return BadRequest(ModelState);
    }

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
                .OrderBy(x=>x.Order)
                .ThenBy(x=>x.Name)
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