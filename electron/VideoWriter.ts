import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { PassThrough } from 'stream';
import fs from 'fs';

// Set ffmpeg path
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

export class VideoWriter {
    private command: ffmpeg.FfmpegCommand | null = null;
    private imageStream: PassThrough | null = null;


    constructor() { }

    start(outputPath: string, audioPath: string | null, fps: number = 60, options: { transparent: boolean; format: 'mp4' | 'webm' }): Promise<void> {
        return new Promise((resolve, reject) => {
            this.imageStream = new PassThrough();

            try {
                let cmd = ffmpeg()
                    .input(this.imageStream)
                    .inputOptions([
                        `-r ${fps}`,           // Input frame rate
                        '-f image2pipe',       // Format: Pipe images
                        '-vcodec mjpeg',       // Input codec
                    ]);

                if (audioPath && fs.existsSync(audioPath)) {
                    cmd = cmd.input(audioPath);
                }

                // Construct Output Options based on Format
                const outputOptions: string[] = [];

                if (options.format === 'webm') {
                    // WebM (VP9) for Transparency
                    outputOptions.push(
                        '-c:v libvpx-vp9',
                        '-pix_fmt yuva420p',  // Alpha channel support
                        '-auto-alt-ref 0',    // Critical for transparency
                        '-crf 30',            // Quality/Size balance
                        '-b:v 0'              // Allow CRF to control quality
                    );
                } else {
                    // MP4 (H.264) - Standard
                    outputOptions.push(
                        '-c:v libx264',
                        '-pix_fmt yuv420p',
                        '-crf 23',
                        '-preset fast',
                        '-movflags +faststart'
                    );
                }

                // Add Audio Codec
                // For WebM we usually use libopus or libvorbis. For MP4 use aac.
                // However, fluent-ffmpeg might auto-select. Let's be explicit if possible, 
                // or let ffmpeg decide based on container.
                // MP4 default is usually AAC. WebM is Vorbis/Opus. 
                // Let's rely on auto for audio to keep it simple unless we hit issues.

                cmd = cmd
                    .output(outputPath)
                    .outputOptions(outputOptions)
                    .on('start', (_commandLine) => {
                        console.log('FFmpeg process started:', _commandLine);
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('FFmpeg error:', err);
                    })
                    .on('end', () => {
                        console.log('FFmpeg processing finished!');
                    });

                this.command = cmd;
                this.command.run();

            } catch (error) {
                reject(error);
            }
        });
    }

    writeFrame(data: Buffer) {
        if (this.imageStream && !this.imageStream.destroyed) {
            this.imageStream.write(data);
        }
    }

    finish(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.command || !this.imageStream) {
                resolve();
                return;
            }

            // Ending the stream tells FFmpeg we are done sending frames.
            // FFmpeg will finish encoding and then emit 'end'.
            this.command.on('end', () => {
                this.command = null;
                resolve();
            });

            this.command.on('error', (err) => {
                console.error('Error during finish:', err);
                reject(err);
            });

            this.imageStream.end();
            this.imageStream = null;
        });
    }
}
