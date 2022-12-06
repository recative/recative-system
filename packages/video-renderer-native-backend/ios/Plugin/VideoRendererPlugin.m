#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the CAP_PLUGIN Macro, and
// each method the plugin supports using the CAP_PLUGIN_METHOD macro.
CAP_PLUGIN(VideoRendererPlugin, "videoRenderer",
           CAP_PLUGIN_METHOD(createTask,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(finalize,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(removeAllListeners, CAPPluginReturnNone);
           CAP_PLUGIN_METHOD(cancelTask, CAPPluginReturnPromise);
)
