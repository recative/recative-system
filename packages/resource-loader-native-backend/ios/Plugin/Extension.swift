//
//  Extension.swift
//  Plugin
//
//  Created by Sun on 2022/2/26.
//  Copyright © 2022 Max Lynch. All rights reserved.
//

import Foundation
import CommonCrypto

extension URL {
    var isDirectory: Bool {
           (try? resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory == true
        }
    var attributes: [FileAttributeKey : Any]? {
            do {
                return try FileManager.default.attributesOfItem(atPath: path)
            } catch let error as NSError {
                print("FileAttribute error: \(error)")
            }
            return nil
        }

        var fileSize: UInt64 {
            return attributes?[.size] as? UInt64 ?? UInt64(0)
        }

        var fileSizeString: String {
            return ByteCountFormatter.string(fromByteCount: Int64(fileSize), countStyle: .file)
        }

        var creationDate: Date? {
            return attributes?[.creationDate] as? Date
        }
}
extension String {
    func toMd5() -> String?{
        let bufferSize = 1024 * 1024
                do {
                    //打开文件
                    let file = try FileHandle(forReadingFrom: URL(string:self)!)
                    defer {
                        file.closeFile()
                    }
                     
                    //初始化内容
                    var context = CC_MD5_CTX()
                    CC_MD5_Init(&context)
                     
                    //读取文件信息
                    while case let data = file.readData(ofLength: bufferSize), data.count > 0 {
                        data.withUnsafeBytes {
                            _ = CC_MD5_Update(&context, $0, CC_LONG(data.count))
                        }
                    }
                     
                    //计算Md5摘要
                    var digest = Data(count: Int(CC_MD5_DIGEST_LENGTH))
                    digest.withUnsafeMutableBytes {
                        _ = CC_MD5_Final($0, &context)
                    }
                     
                    return digest.map { String(format: "%02hhx", $0) }.joined()
                     
                } catch {
                    print("Cannot open file:", error.localizedDescription)
                    return nil
                }
    }
}
extension FileManager {
    func urls(for directory: FileManager.SearchPathDirectory, skipsHiddenFiles: Bool = true ) -> [URL]? {
        let documentsURL = urls(for: directory, in: .userDomainMask)[0]
        let fileURLs = try? contentsOfDirectory(at: documentsURL, includingPropertiesForKeys: nil, options: skipsHiddenFiles ? .skipsHiddenFiles : [] )
        return fileURLs
    }
}
