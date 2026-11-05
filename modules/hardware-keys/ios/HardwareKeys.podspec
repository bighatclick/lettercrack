Pod::Spec.new do |s|
  s.name           = 'HardwareKeys'
  s.version        = '1.0.0'
  s.summary        = 'Hardware keyboard input for the LetterCrack puzzle screen'
  s.description    = 'Local Expo module: an invisible first-responder view that reports key presses.'
  s.license        = 'UNLICENSED'
  s.author         = 'LetterCrack'
  s.homepage       = 'https://lettercrack.app'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
