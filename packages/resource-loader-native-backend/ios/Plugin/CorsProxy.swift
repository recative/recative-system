//
//  CorsProxy.swift
//  Plugin
//  copy from here: https://gist.github.com/sciolist/2e741ff651ffe58b28f4#file-corsproxy-swift
//  compat to swift 5.1
//  Created by Sun on 2022/3/3.
//  Copyright © 2022 Max Lynch. All rights reserved.
//

import Foundation
import GCDWebServer
class CorsProxy {
    lazy var queryDao = QueryDao()
    init(webserver : GCDWebServer!, urlPrefix: String) {
        let prefix =
            (urlPrefix.hasPrefix("/") ? "" : "/")
            + urlPrefix
            + (urlPrefix.hasSuffix("/") ? "" : "/")
        
        let pattern = "^" + NSRegularExpression.escapedPattern(for: prefix) + ".*"
        webserver.addDefaultHandler(forMethod: "GET", request: GCDWebServerDataRequest.self , processBlock:{ req in
            return self.sendCorsHeaders(prefix, req: req)
        })
        webserver.addDefaultHandler(forMethod: "POST", request: GCDWebServerDataRequest.self , processBlock:{ req in
            return self.sendProxyResult(prefix, req: req)
        })
        webserver.addDefaultHandler(forMethod: "OPTIONS", request: GCDWebServerDataRequest.self , processBlock:{ req in
            return self.sendCorsHeaders(prefix, req: req)
        })
       
        webserver.addHandler(forMethod: "POST", pathRegex: pattern, request: GCDWebServerDataRequest.self, processBlock:{ req in
            return self.sendProxyResult(prefix, req: req)
        })
        
        webserver.addHandler(forMethod: "PUT", pathRegex: pattern, request: GCDWebServerDataRequest.self, processBlock:{ req in
            return self.sendProxyResult(prefix, req: req)
        })
        
        webserver.addHandler(forMethod: "PATCH", pathRegex: pattern, request: GCDWebServerDataRequest.self, processBlock:{ req in
            return self.sendProxyResult(prefix, req: req)
        })
        
        webserver.addHandler(forMethod: "DELETE", pathRegex: pattern, request: GCDWebServerDataRequest.self, processBlock:{ req in
            return self.sendCorsHeaders(prefix, req: req)
        })
        
        webserver.addHandler(forMethod: "GET", pathRegex: pattern, request: GCDWebServerRequest.self, processBlock:{ req in
            return self.sendCorsHeaders(prefix, req: req)
        })
        
        webserver.addHandler(forMethod: "OPTIONS", pathRegex: pattern, request: GCDWebServerRequest.self, processBlock:{ req in
            return self.sendCorsHeaders(prefix, req: req)
        })
        webserver.addHandler(forMethod: "HEAD", pathRegex: pattern, request: GCDWebServerRequest.self, processBlock:{ req in
            return self.sendHead(prefix, req: req)
        })
        webserver.addDefaultHandler(forMethod: "HEAD", request: GCDWebServerRequest.self, processBlock:{ req in
            return self.sendHead(prefix, req: req)
        })
    }
    
    func sendProxyResult(_ prefix: String, req: GCDWebServerRequest) -> GCDWebServerResponse! {
        let query = req.url.query == nil ? "" : "?" + req.url.query!
        let url = NSURL(string: req.path.substring(from:prefix.endIndex) + query)
        if (url == nil) { return sendError("Invalid URL") }
        var _: NSErrorPointer? = nil
        var urlResp: URLResponse?
        let urlReq = NSMutableURLRequest(url: url! as URL, cachePolicy: NSURLRequest.CachePolicy.reloadIgnoringLocalCacheData, timeoutInterval: 320000)
        urlReq.httpMethod = req.method
        urlReq.allHTTPHeaderFields = req.headers
        urlReq.allHTTPHeaderFields?["Host"] = url!.host
        if (req.hasBody()) {
            urlReq.httpBody = (req as! GCDWebServerDataRequest).data
        }
        var output : Data?
        do {
            output = try NSURLConnection.sendSynchronousRequest(urlReq as URLRequest
                                                                , returning: &urlResp)
        }catch {
            return nil
        }
        if (urlResp == nil) {
            return sendError(output == nil ? nil : NSString(data: output!, encoding: String.Encoding.utf8.rawValue) as String?);
        }
        
        _ = urlResp as! HTTPURLResponse
        
        let isResource = req.url.pathComponents.count == 2
        let resourceId = isResource ? req.url.lastPathComponent : req.url.relativePath
        let response = isResource ? GCDWebServerDataResponse(text: resourceId)!:GCDWebServerErrorResponse(statusCode: 404)
        response.setValue("*", forAdditionalHeader: "Access-Control-Allow-Origin")
        response.setValue("PUT,POST,GET,PATCH,DELETE,HEAD", forAdditionalHeader: "Access-Control-Allow-Methods")
        response.setValue("true", forAdditionalHeader: "Access-Control-Allow-Credentials")
        return response
    }
    
    func fetchResource(filePath:String) -> String? {
        if let fp = queryDao.queryDownloadTaskModelByResourceId(filePath)?.location {
            let rootDirectory = NSSearchPathForDirectoriesInDomains(FileManager.SearchPathDirectory.cachesDirectory, FileManager.SearchPathDomainMask.userDomainMask, true).first!
            let rpf = fp.starts(with: "/") ? fp : "/\(fp)"
            return rootDirectory.appending("\(rpf)")
        } else {
            return nil
        }
    }
    func fetchBundle(filePath:String) -> String? {
        let rootDirector = NSSearchPathForDirectoriesInDomains(FileManager.SearchPathDirectory.applicationSupportDirectory, FileManager.SearchPathDomainMask.userDomainMask, true).first?.appending("/bundles")
        let file = rootDirector?.appending(filePath)
        if FileManager.default.fileExists(atPath: file!) {
            return file!
        } else {
           return nil
        }
    }
    
    func sendCorsHeaders(_ prefix: String, req: GCDWebServerRequest) -> GCDWebServerResponse! {
        let model = fetchFile(req.url)
        let response = model != nil && FileManager.default.fileExists(atPath: model!) ? GCDWebServerFileResponse(file:model!)! : GCDWebServerErrorResponse(statusCode : 404)
        response.setValue("*", forAdditionalHeader: "Access-Control-Allow-Origin")
        response.setValue("PUT,POST,GET,PATCH,DELETE,HEAD", forAdditionalHeader: "Access-Control-Allow-Methods")
        response.setValue("true", forAdditionalHeader: "Access-Control-Allow-Credentials")
        return response
    }
    func sendHead(_ prefix: String, req: GCDWebServerRequest) -> GCDWebServerResponse! {
        let model = fetchFile(req.url)
        let size = URL(string: model!)!.fileSize
        let response = model != nil && FileManager.default.fileExists(atPath: model!) ? GCDWebServerDataResponse(text:"")! : GCDWebServerErrorResponse(statusCode : 404)
        response.setValue("*", forAdditionalHeader: "Access-Control-Allow-Origin")
        response.setValue("PUT,POST,GET,PATCH,DELETE,HEAD", forAdditionalHeader: "Access-Control-Allow-Methods")
        response.setValue("true", forAdditionalHeader: "Access-Control-Allow-Credentials")
        response.setValue("\(size)", forAdditionalHeader: "Content-Length")
        return response
    }
    
    func sendError(_ error: String?) -> GCDWebServerResponse! {
        let msg = error == nil ? "An error occured" : error!
        guard let errorData = msg.data(using: String.Encoding.utf8, allowLossyConversion: true) else { return nil }
        let resp = GCDWebServerDataResponse(data: errorData, contentType: "text/plain")
        resp.statusCode = 500
        return resp
    }
    private func fetchFile(_ url:URL) -> String?{
        print("resource: \(url.relativePath),\(url.pathComponents.count),\(url.lastPathComponent)")
        let isResource = url.pathComponents.count == 2
        let resourceId = isResource ? url.lastPathComponent : url.relativePath
        let model = isResource ? fetchResource(filePath: resourceId) : fetchBundle(filePath: resourceId)
        return model
    }
    func toString(v: AnyObject?) -> String! {
        if (v == nil) { return ""; }
//        return String(stringInterpolationSegment: v!)
//        see:https://stackoverflow.com/questions/55369435/argument-labels-stringinterpolationsegment-do-not-match-any-available-overl
        return String(stringInterpolation: v! as! DefaultStringInterpolation)
    }
}
