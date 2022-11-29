package tv.jbcz.resourceloader

import android.util.Base64
import android.util.Log
import java.io.File
import java.io.FileInputStream
import java.math.BigInteger
import java.security.MessageDigest


internal fun ByteArray.toMd5(): String {
    var md = MessageDigest.getInstance("MD5")
    md.update(this)
    var result = BigInteger(1, md.digest()).toString(16)
    if (result.length < 32)
        result = "0$result"
    return result
}

internal fun String.toMd5() = this.encodeToByteArray().toMd5()

internal fun File.toMd5() = FileInputStream(this).readBytes().toMd5()

fun File.toBigMd5(): String {
    var inputStream = FileInputStream(this)
    var buffer = ByteArray(8 * 1024)
    var flag = 0
    var md = MessageDigest.getInstance("MD5")
    flag = inputStream.read(buffer)
    while (flag > 0) {
        md.update(buffer, 0, flag)
        flag = inputStream.read(buffer)
    }
    inputStream.close()
    var result = BigInteger(1, md.digest()).toString(16)
    if (result.length < 32)
        result = "0$result"
    Log.i("fileMd5", "fileMd5:${result}")
    return result
}
internal fun String.base64Encode()=Base64.encodeToString(this.toByteArray(),Base64.DEFAULT)