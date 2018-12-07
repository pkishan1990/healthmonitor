#!/usr/bin/env python3

# Copyright (c) 2018 Kishan Patel <kpatel14@lakeheadu.ca>
# License: GPLv2

import sys, struct, serial, argparse, os
from dateutil.parser import parse





#####################
##### Variables #####
#####################
parser = argparse.ArgumentParser(description='Download stored data from a CMS50D+ oximeter.')
#parser.add_argument('device', type=str, help='path to device file')
#parser.add_argument('outfile', type=str, help='output file path')
parser.add_argument('-s', '--start-time', dest='starttime', type=str, help='start time (\"YYYY-MM-DD HH:MM:SS\")')

args = parser.parse_args()

device = '/dev/ttyUSB0'
starttime = args.starttime
ser = serial.Serial()


###################
##### Helpers #####
###################
# Pack little endian
def _ple(i):
    return struct.pack("<I", i)


def _parse_list(toparse, parsed):
    print
    "start parsing"
    while toparse:
        if len(toparse) > 1:
            # fs = (toparse.pop(0),toparse.pop(0))
            # (f,s) = _get_real_values(fs)
            a = toparse.pop(0);
            b = toparse.pop(0);
            c = toparse.pop(0);
            d = toparse.pop(0);
            e = toparse.pop(0);
            f = toparse.pop(0);
            g = toparse.pop(0);
            h = toparse.pop(0);
            i = toparse.pop(0);
            print
            f & 0x7f, g & 0x7f
        else:
            toparse.pop(0)
    print
    ""


#####################
##### Functions #####
#####################
def configure_serial(ser):
    ser.baudrate = 115200  # 115200
    ser.bytesize = serial.EIGHTBITS  # 8
    ser.parity = serial.PARITY_NONE  # N
    ser.stopbits = serial.STOPBITS_ONE  # 1
    ser.xonxoff = 1  # XON/XOFF flow control
    ser.timeout = 1
    ser.port = device


def get_raw_data(ser):
    #sys.stdout.write("Connecting to device...")
    sys.stdout.flush()
    ser.open()
    #sys.stdout.write("reading...")
    sys.stdout.flush()
    ser.write(b'\x7d\x81\xa1\x80\x80\x80\x80\x80\x80')
    raw = list(ser.read(9))
    while len(raw) >= 9:
        print(raw[5] & 0x7f, raw[6] & 0x7f)
        raw = ser.read(9)
        sys.exit();
    ser.close()
    if len(raw) <= 1:
        print("no data received. Is the device on?")
        exit(43)
    print("done!")
    return raw


def parse_raw_data(data):
    sys.stdout.write("Parsing data...", )
    sys.stdout.flush()
    parsed = []
    _parse_list(data, parsed)
    print("done!")
    return parsed


def get_len_of_parsed_data(parsed):
    return len(parsed) / 2  # 1Hz, two values (pulse and sats)


def write_to_file(parsed, total_len, f):
    sys.stdout.write("Writing to file...", )
    sys.stdout.flush()

    zeroval = _ple(0)
    f.write(_ple(856))
    f.write(_ple(1))
    for _ in range(212):
        f.write(zeroval)
    f.write(_ple(1))
    for _ in range(55):
        f.write(zeroval)
    f.write(_ple(total_len))
    for e in parsed:
        f.write(chr(e))


def change_starttime(f):
    if starttime != None:
        sys.stdout.write("changing start time...", )
        sys.stdout.flush()
        dt = parse(starttime, dayfirst=False, yearfirst=True)
        year = _ple(dt.year)
        month = _ple(dt.month)
        day = _ple(dt.day)
        hour = _ple(dt.hour)
        minute = _ple(dt.minute)
        second = _ple(dt.second)
        f.seek(0x420)
        s = year + month + day + hour + minute + second
        f.write(s)


################
##### Main #####
################
configure_serial(ser)
data = get_raw_data(ser)
parsed = parse_raw_data(data)
total_len = get_len_of_parsed_data(parsed)
f = open(outfile, 'wb')
write_to_file(parsed, total_len, f)
change_starttime(f)
f.close()
print("done!")