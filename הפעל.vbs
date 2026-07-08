Set oShell = CreateObject("WScript.Shell")
Dim appPath
appPath = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))

oShell.Run "cmd /c cd /d """ & appPath & "backend"" && uvicorn main:app --reload --port 8001 --host 0.0.0.0", 0, False

WScript.Sleep 1500

oShell.Run "cmd /c cd /d """ & appPath & "frontend"" && npm run dev", 0, False

WScript.Sleep 4000

oShell.Run "http://localhost:5174"