Sub RunAsAdmin()
    If WScript.Arguments.length = 0 Then 
        CreateObject("Shell.Application").ShellExecute "WScript.exe", """" & _
        WScript.ScriptFullName & """ AdminArg", "", "runas", 1 
        WScript.quit 
    End If
End Sub : RunAsAdmin()
c.run("reg add HKCR\Directory\Background\shell\AA_firefly /ve /d Firefly")
c.run("reg add HKCR\Directory\Background\shell\AA_firefly /v Icon /t REG_SZ /d ""%USERPROFILE%\Downloads\firefly.ico""")
c.run("reg add HKCR\Directory\Background\shell\AA_firefly\command /ve /d ""C:\Program Files\nodejs\node.exe %USERPROFILE%\Downloads\firefly.js -d""")