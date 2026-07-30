@echo off
set "targetFolder=D:\Trading\STR\charts"
set "logFile=%targetFolder%\deleted_files.log"

for /R "%targetFolder%" %%F in (*.MC.PNG) do (
    echo Deleting %%F >> "%logFile%"
    del /Q "%%F"
)