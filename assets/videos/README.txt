Put your demo videos in this folder, using these exact names
(or change the paths in index.html -> data-video attributes):

  more-cafe.mp4
  la-lune.mp4
  jude-clinic.mp4
  alahd.mp4
  power-fitness.mp4

Tips: H.264 (.mp4), 720p-1080p, 5-20 MB each, "fast start" enabled
(ffmpeg -i in.mp4 -c:v libx264 -crf 24 -preset slow -movflags +faststart -an out.mp4)
Phone demos look best as portrait recordings, laptop demos as landscape.
