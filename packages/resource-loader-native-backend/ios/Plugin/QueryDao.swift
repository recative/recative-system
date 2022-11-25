//
//  QueryDao.swift
//  Plugin
//
//  Created by Sun on 2022/3/22.
//  Copyright © 2022 Max Lynch. All rights reserved.
//

import Foundation
import SQLite
import ActiveSQLite

class QueryDao{
    init(){}
    public func queryDownloadTaskModelByResourceId(_ resourceId:String) -> DownloadTaskModel?{
        let express = Expression<String>("resourceId")
        let model = DownloadFileModel.findAll(express == resourceId, orders:[DownloadFileModel.id.desc]).first
        
        if model == nil {return nil}
        
        let id = Expression<NSNumber>("id")
        let expres = Expression<String>("location")
        let downloadModel = DownloadTaskModel.findAll(id == NSNumber(value:model!.downloadmanagerId.int64Value),orders:[DownloadTaskModel.id.desc]).last
        return downloadModel
    }
    public func queryFileModelByResourceId(_ id:String) -> [DownloadFileModel] {
        let resourceId = Expression<String>("resourceId")
        return DownloadFileModel.findAll( resourceId == id,orders: [DownloadFileModel.id.asc])
    }
}
