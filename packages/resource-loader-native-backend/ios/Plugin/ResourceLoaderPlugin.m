#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the CAP_PLUGIN Macro, and
// each method the plugin supports using the CAP_PLUGIN_METHOD macro.
CAP_PLUGIN(ResourceLoaderPlugin, "ResourceLoader",
           CAP_PLUGIN_METHOD(echo, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(queryFile, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(fetchFile,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(deleteFile,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(deleteFileByIds,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(test, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(testError, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(removeAllListeners, CAPPluginReturnNone);
           CAP_PLUGIN_METHOD(unZip, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(ls, CAPPluginReturnPromise);
)
