; „Öffnen mit → PseudoDoc Pro“ für die Dateiarten, die der Organizer liest – nur für diesen Benutzer. Ändert keine Standard-Zuordnung.
; Die Datei wird beim Öffnen KOPIERT (windows/engine/src/DesktopEingang.java); das Original bleibt, wo es ist.
!macro PD_ART EXT
  WriteRegStr HKCU "Software\Classes\Applications\pseudodoc-pro.exe\SupportedTypes" "${EXT}" ""
!macroend
!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr HKCU "Software\Classes\Applications\pseudodoc-pro.exe" "FriendlyAppName" "PseudoDoc Pro"
  WriteRegStr HKCU "Software\Classes\Applications\pseudodoc-pro.exe\shell\open\command" "" '$\"$INSTDIR\pseudodoc-pro.exe$\" $\"%1$\"'
  WriteRegStr HKCU "Software\Classes\Applications\pseudodoc-pro.exe\DefaultIcon" "" '$\"$INSTDIR\pseudodoc-pro.exe$\",0'
  !insertmacro PD_ART ".pdf"
  !insertmacro PD_ART ".jpg"
  !insertmacro PD_ART ".jpeg"
  !insertmacro PD_ART ".png"
  !insertmacro PD_ART ".tif"
  !insertmacro PD_ART ".tiff"
  !insertmacro PD_ART ".eml"
  !insertmacro PD_ART ".txt"
  !insertmacro PD_ART ".docx"
  !insertmacro PD_ART ".xlsx"
  !insertmacro PD_ART ".pptx"
  !insertmacro PD_ART ".odt"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegKey HKCU "Software\Classes\Applications\pseudodoc-pro.exe"
!macroend
