import lemonade from 'lemonadejs'

function Header() {
  const selectFolder = async () => {
    const result = await window.api.selectFolder()
    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0]
      const audioFiles = await window.api.getAudioFiles(folderPath)

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
        <button class="btn btn-primary" onclick="${selectFolder}">Selecionar Pasta</button>
        <button class="btn btn-outline" onclick="${reset}">Reset</button>
      </div>
    </header>
  `
}

function Content() {
  this.audioFiles = []

  const playAudio = (audioFile) => {
    const app = lemonade.get('App')
    app.nowPlaying = audioFile
    app.refresh()
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (render) => render`
    <main class="app-content">
      <div class="audio-list" style="display: ${this.audioFiles.length > 0 ? 'block' : 'none'}">
        <h3>Arquivos de Áudio</h3>
        <div class="audio-grid">
          ${this.audioFiles.map((audioFile, index) => `
            <div class="audio-item" data-audio-index="${index}">
              <div class="audio-icon">🎵</div>
              <div class="audio-info">
                <div class="audio-name" title="${audioFile.name}">${audioFile.name}</div>
                <div class="audio-size">${formatFileSize(audioFile.size)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="empty-state" style="display: ${this.audioFiles.length === 0 ? 'block' : 'none'}">
        <div class="empty-icon">📁</div>
        <div class="empty-text">Selecione uma pasta para carregar arquivos de áudio</div>
      </div>
    </main>
  `
}

function Player() {
  this.progress = 0
  this.isPlaying = false
  this.currentTime = 0
  this.duration = 0
  this.audio = null

  const initAudio = () => {
    if (this.audio) {
      this.audio.pause()
      this.audio = null
    }

    if (this.nowPlaying) {
      this.audio = new Audio(this.nowPlaying.path)

      this.audio.addEventListener('loadedmetadata', () => {
        this.duration = this.audio.duration
        this.refresh()
      })

      this.audio.addEventListener('timeupdate', () => {
        this.currentTime = this.audio.currentTime
        this.progress = (this.currentTime / this.duration) * 100
        if (progressFill) {
          progressFill.style.width = `${this.progress}%`
        }
        this.refresh()
      })

      this.audio.addEventListener('ended', () => {
        this.isPlaying = false
        this.progress = 0
        this.currentTime = 0
        if (progressFill) {
          progressFill.style.width = '0%'
        }
        this.refresh()
      })
    }
  }

  const play = () => {
    if (!this.audio) initAudio()
    if (this.audio) {
      this.audio.play()
      this.isPlaying = true
      this.refresh()
    }
  }

  const pause = () => {
    if (this.audio) {
      this.audio.pause()
      this.isPlaying = false
      this.refresh()
    }
  }

  const stop = () => {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
      this.isPlaying = false
      this.progress = 0
      this.currentTime = 0
      if (progressFill) {
        progressFill.style.width = '0%'
      }
      this.refresh()
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  let progressFill = null
  const onprogressclick = (event) => {
    if (!this.audio || !progressFill) return

    const progressBar = event.target.closest('.player-controls-progress-bar')
    if (!progressBar) return

    const rect = progressBar.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const width = rect.width
    const percentage = (offsetX / width) * 100

    const newTime = (percentage / 100) * this.duration
    this.audio.currentTime = newTime
    this.progress = percentage
    progressFill.style.width = `${percentage}%`
  }

  // Watch for changes in nowPlaying
  this.onchanges = () => {
    if (this.nowPlaying && this.audio?.src !== this.nowPlaying.path) {
      initAudio()
    }
  }

  return (render) => render`
    <div class="app-player" style="display: ${this.nowPlaying ? 'block' : 'none'}">
      <div class="player-info">
        <div class="player-track-name">${this.nowPlaying?.name || ''}</div>
        <div class="player-time">
          ${formatTime(this.currentTime)} / ${formatTime(this.duration)}
        </div>
      </div>
      <div class="player-controls">
        <div class="player-controls-buttons">
          <button class="btn btn-icon" onclick="${this.isPlaying ? pause : play}">
            ${this.isPlaying ? '⏸' : '▶'}
          </button>
          <button class="btn btn-icon" onclick="${stop}">⏹</button>
        </div>
        <div class="player-controls-progress">
          <div class="player-controls-progress-bar" onclick="${onprogressclick}">
            <div class="player-controls-progress-fill" :ref=${(e) => (progressFill = e)}></div>
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
    lemonade.setComponents({ Header, Content, Player })
    const app = lemonade.render(Root, document.getElementById('app'))

    // Add event listener for audio item clicks
    document.addEventListener('click', (event) => {
      const audioItem = event.target.closest('.audio-item')
      if (audioItem) {
        const index = parseInt(audioItem.dataset.audioIndex)
        const appInstance = lemonade.get('App')
        if (appInstance.audioFiles[index]) {
          appInstance.nowPlaying = appInstance.audioFiles[index]
          appInstance.refresh()
        }
      }
    })
  })
}

init()
