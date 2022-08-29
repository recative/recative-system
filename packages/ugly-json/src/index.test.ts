import { parse } from './parse';
import { stringify } from './stringify';

const RAW_JSON_DATA = '{"episode":{"id":"dVWZ_CMTKuk3pEpaTbqqq","label":{"en":"Debug Episode","zh-Hans":"测试分集","zh-Hant":"測試分集"},"order":999,"largeCoverResourceId":"","createTime":1647936684403,"updateTime":1647936684403},"assets":[{"id":"IKbKE_ldSaEylm8OmBjZC","duration":null,"order":1,"spec":{"contentExtensionId":"@recative/content-extension-act-point","id":"IKbKE_ldSaEylm8OmBjZC","label":"p1","firstLevelPath":"Debug","secondLevelPath":"p1","fullPath":"Debug/p1","entryPoints":{"@recative/uploader-extension-desktop-shell/shell":"recative://ap/dist/","@recative/uploader-extension-mobile-shell/build-in":"/bundle/ap/dist/","@recative/uploader-extension-mobile-shell/cached":"http://localhost:34652/"},"resolutionMode":"player","width":1000,"height":562},"preloadDisabled":false,"earlyDestroyOnSwitch":false}],"resources":[{"type":"file","id":"0.t0q2yzctyw","label":"0.faihoe8ci0j","mimeType":"image/png","convertedHash":{"md5":"0.y4jb8oxmbh","xxHash":"0.9dulwtb2b"},"cacheToHardDisk":false,"preloadLevel":"preload:none","preloadTriggers":["trigger1", "trigger2", "trigger3"],"episodeIds":["ep1", "ep2", "ep3"],"duration":null,"resourceGroupId":"","url":{"@recative/uploader-mock/MockUploader":"0.tleri8wk1o"},"tags":["category:image"],"extensionConfigurations":{}},{"type":"file","id":"0.en6wonilz44","label":"0.hp1mzp929zi","mimeType":"image/png","convertedHash":{"md5":"0.eiyolgdquof","xxHash":"0.qjv3rt7q758"},"cacheToHardDisk":false,"preloadLevel":"preload:none","preloadTriggers":["trigger1","trigger2","trigger3","trigger4"],"episodeIds":["ep1","ep2","ep3"],"duration":null,"resourceGroupId":"","url":{"@recative/uploader-mock/MockUploader":"0.5xffmmipcyd"},"tags":["category:image"],"extensionConfigurations":{}},{"type":"file","id":"0.y4k0ojbnsf","label":"0.dpjgpk4pkmk","mimeType":"image/png","convertedHash":{"md5":"0.4z8c4p47u2p","xxHash":"0.qeyiappguxb"},"cacheToHardDisk":false,"preloadLevel":"preload:none","preloadTriggers":["trigger1","trigger2","trigger3","trigger4"],"episodeIds":["ep1","ep2","ep3"],"duration":null,"resourceGroupId":"","url":{"@recative/uploader-mock/MockUploader":"0.ssgf9bea3q"},"tags":["category:image"],"extensionConfigurations":{}},{"type":"file","id":"0.9vdiu2bjt85","label":"0.yxuxfdncpdh","mimeType":"image/png","convertedHash":{"md5":"0.7guwopus4yu","xxHash":"0.qklyg84b25"},"cacheToHardDisk":false,"preloadLevel":"preload:none","preloadTriggers":["trigger1","trigger2"],"episodeIds":["ep1","ep2"],"duration":null,"resourceGroupId":"","url":{"@recative/uploader-mock/MockUploader":"0.wlks1vixx9"},"tags":["category:image"],"extensionConfigurations":{}}],"key":"dVWZ_CMTKuk3pEpaTbqqq"}';

describe('stringify', () => {
  it('should stringify correctly', () => {
    const originalData = JSON.parse(RAW_JSON_DATA);
    const serializedData = stringify(originalData);
    const splittedResult = serializedData.split('\n');

    expect(splittedResult).toHaveLength(2);
  });
});

describe('parse', () => {
  it('should parse correctly', () => {
    const originalData = JSON.parse(RAW_JSON_DATA);
    const parsedData = parse(stringify(originalData));

    expect(parsedData).toEqual(originalData);
  });
});
