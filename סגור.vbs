Set oShell = CreateObject("WScript.Shell")

' סגירת השרתים
oShell.Run "taskkill /F /FI ""WINDOWTITLE eq uvicorn*"" /T", 0, True
oShell.Run "taskkill /F /IM uvicorn.exe /T", 0, True
oShell.Run "cmd /c taskkill /F /IM node.exe /T", 0, True

MsgBox "האפליקציה נסגרה.", 64, "פורטל דיירים"
