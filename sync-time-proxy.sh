#!/bin/bash

# HTTP Time Sync Script with Proxychains4
# Synchronizes system time via HTTP when NTP is blocked
# Helps chrony maintain time accuracy

# Color definitions
color_green='\033[0;32m'
color_red='\033[0;31m'
color_yellow='\033[1;33m'
color_blue='\033[0;34m'
color_nocolor='\033[0m'

# Log function
log_info() {
    echo -e "${color_blue}[INFO]${color_nocolor} $1"
    logger -t timesync-proxy "[INFO] $1"
}

log_success() {
    echo -e "${color_green}[SUCCESS]${color_nocolor} $1"
    logger -t timesync-proxy "[SUCCESS] $1"
}

log_warning() {
    echo -e "${color_yellow}[WARNING]${color_nocolor} $1"
    logger -t timesync-proxy "[WARNING] $1"
}

log_error() {
    echo -e "${color_red}[ERROR]${color_nocolor} $1"
    logger -t timesync-proxy "[ERROR] $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Check dependencies
check_dependencies() {
    local missing_deps=()
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if ! command -v proxychains4 &> /dev/null; then
        log_error "proxychains4 is not installed. Please install it first."
        exit 1
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_warning "Missing dependencies: ${missing_deps[*]}"
        log_info "Installing dependencies via proxychains4..."
        
        export DEBIAN_FRONTEND=noninteractive
        proxychains4 apt-get update -qq
        for dep in "${missing_deps[@]}"; do
            log_info "Installing $dep..."
            proxychains4 apt-get install -y -qq "$dep"
        done
        
        log_success "Dependencies installed successfully"
    fi
}

# Get chrony status before sync
get_chrony_offset() {
    if command -v chronyc &> /dev/null; then
        local offset=$(chronyc tracking 2>/dev/null | grep "Last offset" | awk '{print $4}')
        echo "$offset"
    else
        echo "0"
    fi
}

# Fetch time from WorldTimeAPI (Primary source)
fetch_time_worldtimeapi() {
    log_info "Fetching time from WorldTimeAPI (Asia/Tehran)..."
    
    local response=$(proxychains4 -q curl -s --max-time 15 \
        "http://worldtimeapi.org/api/timezone/Asia/Tehran" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        # Parse JSON response
        local datetime=$(echo "$response" | jq -r '.datetime' 2>/dev/null)
        
        if [ -n "$datetime" ] && [ "$datetime" != "null" ]; then
            # Convert ISO 8601 to date format: 2025-12-26T13:30:45.123456+03:30
            # Extract date and time without timezone
            local clean_datetime=$(echo "$datetime" | sed 's/\.[0-9]*+.*//' | tr 'T' ' ')
            log_success "WorldTimeAPI: $clean_datetime"
            echo "$clean_datetime"
            return 0
        fi
    fi
    
    log_warning "WorldTimeAPI failed or returned invalid data"
    return 1
}

# Fetch time from TimeAPI (Fallback 1)
fetch_time_timeapi() {
    log_info "Fetching time from TimeAPI..."
    
    local response=$(proxychains4 -q curl -s --max-time 15 \
        "http://timeapi.io/api/Time/current/zone?timeZone=Asia/Tehran" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        local datetime=$(echo "$response" | jq -r '.dateTime' 2>/dev/null)
        
        if [ -n "$datetime" ] && [ "$datetime" != "null" ]; then
            # Convert from ISO format
            local clean_datetime=$(echo "$datetime" | sed 's/\.[0-9]*$//' | tr 'T' ' ')
            log_success "TimeAPI: $clean_datetime"
            echo "$clean_datetime"
            return 0
        fi
    fi
    
    log_warning "TimeAPI failed or returned invalid data"
    return 1
}

# Fetch time from Google (Fallback 2 - using Date header)
fetch_time_google() {
    log_info "Fetching time from Google Date header..."
    
    local date_header=$(proxychains4 -q curl -s -I --max-time 15 \
        "http://www.google.com" 2>/dev/null | grep -i "^date:" | cut -d' ' -f2-)
    
    if [ $? -eq 0 ] && [ -n "$date_header" ]; then
        # Convert HTTP date to local time
        # HTTP date is in GMT, we need to convert to Asia/Tehran (+03:30)
        local gmt_time=$(date -d "$date_header" "+%Y-%m-%d %H:%M:%S" 2>/dev/null)
        
        if [ -n "$gmt_time" ]; then
            # Convert GMT to Asia/Tehran (+3:30)
            local tehran_time=$(date -d "$gmt_time UTC + 3 hours + 30 minutes" "+%Y-%m-%d %H:%M:%S" 2>/dev/null)
            log_success "Google: $tehran_time"
            echo "$tehran_time"
            return 0
        fi
    fi
    
    log_warning "Google Date header failed"
    return 1
}

# Try all time sources
fetch_time_with_fallback() {
    local fetched_time=""
    
    # Try primary source
    fetched_time=$(fetch_time_worldtimeapi)
    if [ $? -eq 0 ] && [ -n "$fetched_time" ]; then
        echo "$fetched_time"
        return 0
    fi
    
    # Try fallback 1
    fetched_time=$(fetch_time_timeapi)
    if [ $? -eq 0 ] && [ -n "$fetched_time" ]; then
        echo "$fetched_time"
        return 0
    fi
    
    # Try fallback 2
    fetched_time=$(fetch_time_google)
    if [ $? -eq 0 ] && [ -n "$fetched_time" ]; then
        echo "$fetched_time"
        return 0
    fi
    
    log_error "All time sources failed"
    return 1
}

# Set system time
set_system_time() {
    local new_time="$1"
    
    log_info "Current system time: $(date '+%Y-%m-%d %H:%M:%S %z')"
    log_info "Setting system time to: $new_time"
    
    # Set the time
    if date -s "$new_time" &>/dev/null; then
        log_success "System time updated successfully"
        log_info "New system time: $(date '+%Y-%m-%d %H:%M:%S %z')"
        return 0
    else
        log_error "Failed to set system time"
        return 1
    fi
}

# Force chrony to step time immediately
sync_chrony() {
    if command -v chronyc &> /dev/null; then
        log_info "Forcing chrony to step time..."
        
        # Make chrony update immediately
        chronyc makestep &>/dev/null
        sleep 2
        
        # Get tracking info
        local tracking=$(chronyc tracking 2>/dev/null)
        if [ -n "$tracking" ]; then
            log_info "Chrony tracking status:"
            echo "$tracking" | while IFS= read -r line; do
                log_info "  $line"
            done
        fi
        
        log_success "Chrony sync completed"
    else
        log_warning "chronyc not found, skipping chrony sync"
    fi
}

# Main execution
main() {
    log_info "=== HTTP Time Sync via Proxychains4 ==="
    log_info "Started at: $(date)"
    
    # Check and install dependencies
    check_dependencies
    
    # Get initial chrony offset
    local offset_before=$(get_chrony_offset)
    if [ -n "$offset_before" ] && [ "$offset_before" != "0" ]; then
        log_info "Chrony offset before sync: ${offset_before}s"
    fi
    
    # Fetch time from HTTP sources
    log_info "Fetching current time via HTTP..."
    local fetched_time=$(fetch_time_with_fallback)
    
    if [ $? -eq 0 ] && [ -n "$fetched_time" ]; then
        # Set system time
        if set_system_time "$fetched_time"; then
            # Sync with chrony
            sync_chrony
            
            # Get final chrony offset
            local offset_after=$(get_chrony_offset)
            if [ -n "$offset_after" ] && [ "$offset_after" != "0" ]; then
                log_info "Chrony offset after sync: ${offset_after}s"
            fi
            
            log_success "=== Time sync completed successfully ==="
            exit 0
        else
            log_error "=== Time sync failed: Could not set system time ==="
            exit 1
        fi
    else
        log_error "=== Time sync failed: Could not fetch time from any source ==="
        exit 1
    fi
}

# Run main function
main
