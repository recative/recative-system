require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'RecativeResourceLoaderNativeBackend'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = package['repository']['url']
  s.author = package['author']
  s.source = { :git => package['repository']['url'], :tag => s.version.to_s }
  s.source_files = 'ios/Plugin/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target  = '12.0'
  s.dependency 'Capacitor'
  s.dependency "ActiveSQLite"
  # s.dependency "SDDownloadManager"
  s.dependency "SwiftState"
  s.dependency "SSZipArchive"
  # , :git => "https://github.com/ReactKit/SwiftState.git"
  s.dependency "GCDWebServer/WebDAV", "~> 3.0"
  s.swift_version = '5.1'
  s.info_plist = {
    'IPHONEOS_DEPLOYMENT_TARGET' => '12.0'
  }
  
end
