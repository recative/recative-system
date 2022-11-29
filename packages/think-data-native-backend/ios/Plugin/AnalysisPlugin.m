#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the CAP_PLUGIN Macro, and
// each method the plugin supports using the CAP_PLUGIN_METHOD macro.
CAP_PLUGIN(AnalysisPlugin, "Analysis",
           CAP_PLUGIN_METHOD(initSdk, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getDistinctId,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(setDistinctId,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(signIn,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(signOut,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(track,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(setPublicProperties,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(unsetPublicProperties,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(clearPublicProperties,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getPublicProperties,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(eventStart,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(eventEnd,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(userSet,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(userSetOnce,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(userAdd,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(userUnSet,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(userDelete,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(userAppend,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(userUniqAppend,CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getDeviceId,CAPPluginReturnPromise);
)
