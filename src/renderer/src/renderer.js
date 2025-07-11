import lemonade from 'lemonadejs'

function Header() {
  const selectFolder = async () => {
    const result = await window.api.selectFolder()
    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0]

      let audioFiles = await window.api.getAudioFiles(folderPath)
      audioFiles = audioFiles.map((file, index) => ({ ...file, index }))

      const app = lemonade.get('App')
      app.audioFiles = audioFiles
      app.selectedFolder = folderPath
      app.refresh()
    }
  }

  const reset = () => {
    const app = lemonade.get('App')
    app.audioFiles = []
    app.selectedFolder = null
    app.nowPlaying = null
    app.refresh()
  }

  return (render) => render`
    <header class="app-header">
      <div class="header-logo">MS</div>
      <div class="header-actions">
        <button class="btn btn-primary" onclick="${selectFolder}">Select folder</button>
        <button class="btn btn-outline" onclick="${reset}">Reset</button>
      </div>
    </header>
  `
}

function AudioItem() {
  const selectAudio = () => {
    const app = lemonade.get('App')
    const audioFile = app.audioFiles[this.index]
    if (audioFile) {
      app.nowPlaying = audioFile
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (render) => render`
    <button class="audio-item" onclick="${selectAudio}">
      <p>${this.name}</p>
      <p>size: ${formatFileSize(this.size)}</p>
    </button>
  `
}

function Content() {
  this.audioFiles = []
  this.contentElement = null

  this.onchange = () => {
    if (!this.contentElement) return
    this.contentElement.classList.toggle('has-audio', this.audioFiles.length > 0)
  }

  return (render) => render`
    <main class="app-content" :ref=${(e) => (this.contentElement = e)}>
      <div class="audio-list">
        <h3>Audios</h3>
        <div class="audio-grid">
          <AudioItem :loop="${this.audioFiles}" />
        </div>
      </div>
      <div class="empty-state">
        <div class="empty-icon">📁</div>
        <div class="empty-text">Select a folder to load audio files</div>
      </div>
    </main>
  `
}

function Player() {
  this.isPlaying = false
  this.currentTime = 0
  this.duration = 0
  this.nowPlaying = null
  this.audio = null

  let progressBar = null
  let progressFill = null

  const initAudio = () => {
    if (this.audio) {
      this.audio.pause()
      this.isPlaying = false
      this.duration = 0
      this.currentTime = 0
      this.audio = null
    }

    if (this.nowPlaying) {
      this.audio = new Audio('file://' + this.nowPlaying.path)
      console.log(this)

      this.audio.addEventListener('loadedmetadata', () => {
        this.duration = this.audio.duration
        this.refresh()
      })

      this.audio.addEventListener('timeupdate', () => {
        this.currentTime = this.audio.currentTime
        const percentage = (this.currentTime / this.duration) * 100
        if (progressFill) {
          progressFill.style.width = `${percentage}%`
        }
      })

      this.audio.addEventListener('ended', () => {
        this.isPlaying = false
        this.currentTime = 0
        if (progressFill) {
          progressFill.style.width = '0%'
        }
      })
    }
  }

  const playpause = () => {
    if (!this.audio) initAudio()

    if (this.audio) {
      this.isPlaying = !this.isPlaying
      if (this.isPlaying) {
        this.audio.play()
      } else {
        this.audio.pause()
      }
    }
  }

  const stop = () => {
    if (this.audio) {
      this.audio.pause()
      this.isPlaying = false
      this.currentTime = 0
      this.duration = 0
      this.audio = null

      if (progressFill) {
        progressFill.style.width = '0%'
      }

      const app = lemonade.get('App')
      app.nowPlaying = null
    }
  }

  const onprogressclick = (event) => {
    if (!this.audio || !progressFill || !progressBar) return

    const rect = progressBar.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const width = rect.width
    const percentage = (offsetX / width) * 100

    const newTime = (percentage / 100) * this.duration
    this.audio.currentTime = newTime
    progressFill.style.width = `${percentage}%`
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs < 10 ? '0' + secs : secs}`
  }

  this.onchange = (prop) => {
    switch (prop) {
      case 'nowPlaying':
        initAudio()
        return
    }
  }

  return (render) => render`
    <div class="app-player" style="display: ${this.nowPlaying ? 'block' : 'none'}">
      <div class="player-info">
        <div class="player-track-name">${this.nowPlaying?.name || ''}</div>
      </div>
      <div class="player-controls">
        <div class="player-controls-buttons">
          <button class="btn btn-icon" onclick="${playpause}">
            ${this.isPlaying ? '⏸' : '▶'}
          </button>
          <button class="btn btn-icon" onclick="${stop}">⏹</button>
        </div>
        <div class="player-controls-progress">
          <div class="player-time">
            ${formatTime(this.currentTime)}
          </div>
          <div class="player-controls-progress-bar" onclick="${onprogressclick}" :ref=${(e) => (progressBar = e)}>
            <div class="player-controls-progress-fill" :ref=${(e) => (progressFill = e)}></div>
          </div>
          <div class="player-time">
            ${formatTime(this.duration)}
          </div>
        </div>
      </div>
    </div>
  `
}

function Root() {
  lemonade.set('App', this)

  this.nowPlaying = null
  this.audioFiles = []
  this.selectedFolder = null

  return (render) => render`
    <div class="root">
      <Header />
      <Content audioFiles="${this.audioFiles}" />
      <Player nowPlaying="${this.nowPlaying}" />
    </div>
  `
}

function init() {
  window.addEventListener('DOMContentLoaded', () => {
    lemonade.setComponents({ Header, Content, Player, AudioItem })
    lemonade.render(Root, document.getElementById('app'))
  })
}

init()
