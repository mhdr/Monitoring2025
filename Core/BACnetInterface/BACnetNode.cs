using System.IO.BACnet;

namespace BACnetInterface;

public class BACnetNode
{
    public BacnetClient sender { get; set; }
    public BacnetAddress adr { get; set; }
    public uint device_id { get; set; }
    public uint max_apdu { get; set; }
    public BacnetSegmentations segmentation { get; set; }
    public ushort vendor_id { get; set; }
}