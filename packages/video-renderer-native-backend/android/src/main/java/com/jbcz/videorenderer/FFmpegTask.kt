package com.jbcz.videorenderer

import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.FFmpegSession
import java.io.File

class FFmpegTask(val renderTaskId:String,val directory:File) {
    fun image2Video(width:Int,height:Int,index:Int,fps:Int,count:Int):FFmpegSession{
        var dir = directory.absolutePath
        val endFrames = count
//                 let executeC = "-f image2 -video_size \(width)x\(height) -pixel_format rgba -framerate 30 -start_number \(index) -i \(m)/%d.raw -frames:v \(endFrames) -c:v h264 -vf \"fps=\(fps), format=yuv420p\" \(d)/\(index).mp4 "
        val command ="-f image2 -video_size ${width}x$height -pixel_format rgba -framerate $fps -start_number $index -i $dir/%d.raw -frames:v $endFrames -c:v h264 -vf \"fps=$fps, format=yuv420p\" $dir/$index.mp4"
        return FFmpegKit.execute(command)
    }
    fun concatVideo(fileName:String,audioFileName:String,outputFileName:String):FFmpegSession{
//         let cmd = "-f concat -safe 0 -i \(fileName) -i \(audioFileName) -c copy \'\(outputName)\'"
        val cmd = "-f concat -safe 0 -i $fileName -i $audioFileName$ -c copy $outputFileName"
        return FFmpegKit.execute(cmd)
    }
}