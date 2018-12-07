#!/usr/bin/python
import serial
ser = serial.Serial('/dev/ttyUSB1',9600)
read_byte = ser.readline()
print(read_byte);
