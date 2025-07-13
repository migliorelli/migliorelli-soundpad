import lemonade, { state, track } from 'lemonadejs'

function getSelectedAudio(app, folderPath, audioPath) {
  return app.selectedFolders.get(folderPath).audioFiles.get(audioPath)
}

function Header() {
  const app = lemonade.get('App')

  const selectFolder = async () => {
    const result = await window.api.selectFolder()
    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0]
      const folderName = folderPath.split('/').pop()

      let audioFiles = await window.api.getAudioFiles(folderPath)
      if (audioFiles.size <= 0) {
        return
      }

      const newSelectedFolders = new Map(app.selectedFolders)
      newSelectedFolders.set(folderPath, {
        folderPath,
        folderName,
        audioFiles
      })

      app.selectedFolders = newSelectedFolders
    }
  }

  const onSettingsClick = () => {
    app.showSettings = true
  }

  const reset = () => {
    app.selectedFolders = new Map()
    app.selectedAudio = null
  }

  return (render) => render`
    <header class="app-header">
      <button class="header-settings-button" onclick="${onSettingsClick}">
        <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30" height="30" fill="currentColor" viewBox="0 0 50 50">
            <path d="M47.16,21.221l-5.91-0.966c-0.346-1.186-0.819-2.326-1.411-3.405l3.45-4.917c0.279-0.397,0.231-0.938-0.112-1.282 l-3.889-3.887c-0.347-0.346-0.893-0.391-1.291-0.104l-4.843,3.481c-1.089-0.602-2.239-1.08-3.432-1.427l-1.031-5.886 C28.607,2.35,28.192,2,27.706,2h-5.5c-0.49,0-0.908,0.355-0.987,0.839l-0.956,5.854c-1.2,0.345-2.352,0.818-3.437,1.412l-4.83-3.45 c-0.399-0.285-0.942-0.239-1.289,0.106L6.82,10.648c-0.343,0.343-0.391,0.883-0.112,1.28l3.399,4.863 c-0.605,1.095-1.087,2.254-1.438,3.46l-5.831,0.971c-0.482,0.08-0.836,0.498-0.836,0.986v5.5c0,0.485,0.348,0.9,0.825,0.985 l5.831,1.034c0.349,1.203,0.831,2.362,1.438,3.46l-3.441,4.813c-0.284,0.397-0.239,0.942,0.106,1.289l3.888,3.891 c0.343,0.343,0.884,0.391,1.281,0.112l4.87-3.411c1.093,0.601,2.248,1.078,3.445,1.424l0.976,5.861C21.3,47.647,21.717,48,22.206,48 h5.5c0.485,0,0.9-0.348,0.984-0.825l1.045-5.89c1.199-0.353,2.348-0.833,3.43-1.435l4.905,3.441 c0.398,0.281,0.938,0.232,1.282-0.111l3.888-3.891c0.346-0.347,0.391-0.894,0.104-1.292l-3.498-4.857 c0.593-1.08,1.064-2.222,1.407-3.408l5.918-1.039c0.479-0.084,0.827-0.5,0.827-0.985v-5.5C47.999,21.718,47.644,21.3,47.16,21.221z M25,32c-3.866,0-7-3.134-7-7c0-3.866,3.134-7,7-7s7,3.134,7,7C32,28.866,28.866,32,25,32z"></path>
        </svg>
      </button>
      <div class="header-actions">
        <button class="btn btn-primary" onclick="${selectFolder}">Add folder</button>
        <button class="btn btn-outline" onclick="${reset}">Reset</button>
      </div>
    </header>
  `
}

function AudioItem() {
  const app = lemonade.get('App')

  const selectAudio = () => {
    app.selectedAudio = getSelectedAudio(app, this.folderPath, this.path)
  }

  return (render) => render`
    <button class="audio-item" id="${this.path}" onclick="${selectAudio}">
      <img class="audio-cover" src="${this.cover}" alt="${this.name}" />
      <div>
        <div class="audio-name">${this.name}</div>
      </div>
    </button>
  `
}

function AudioSection() {
  return (render) => render`
    <div class="audio-list">
      <h3>${this.folderName}</h3>
      <div class="audio-grid">
        <AudioItem :loop="${Array.from(this.audioFiles.values())}" />
      </div>
    </div>
  `
}

function Content() {
  track('selectedFolders')

  let hasAudio = state(this.selectedFolders.size > 0)
  this.onchange = (prop) => {
    if (prop === 'selectedFolders') {
      hasAudio.value = this.selectedFolders.size > 0
    }
  }

  return (render) => render`
    <main class="app-content has-audio">
      <div :render="${hasAudio.value}">
        <div class="audios">
          <AudioSection :loop="${Array.from(this.selectedFolders.values())}"  />
        </div>
      </div>
      <div :render="${!hasAudio.value}">
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <div class="empty-text">Select a folder to load audio files</div>
        </div>
      </div>
    </main>
  `
}

function Player() {
  this.isPlaying = false
  this.duration = 0
  this.audio = null

  let progressBar = null
  let progressFill = null

  const initAudio = () => {
    if (this.audio) {
      this.audio.pause()
      this.isPlaying = false
      this.duration = 0
      this.audio = null
    }

    if (this.nowPlaying) {
      this.audio = new Audio('file://' + this.nowPlaying.path)

      this.audio.addEventListener('loadedmetadata', () => {
        if (this.audio) this.duration = this.audio.duration
      })

      this.audio.addEventListener('timeupdate', () => {
        if (!this.audio) return

        const percentage = (this.audio.currentTime / this.duration) * 100
        if (progressFill) progressFill.style.width = `${percentage}%`
      })

      this.audio.addEventListener('ended', () => {
        this.isPlaying = false
        if (this.audio) this.audio.currentTime = 0
        if (progressFill) progressFill.style.width = '0%'
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
    if (!this.audio) return

    this.audio.pause()
    this.isPlaying = false
    this.audio.currentTime = 0

    if (progressFill) progressFill.style.width = '0%'
  }

  const onprogressclick = (event) => {
    if (!this.audio || !progressFill || !progressBar) return

    const rect = progressBar.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const width = rect.width
    const percentage = (offsetX / width) * 100

    this.audio.currentTime = (percentage / 100) * this.duration
    progressFill.style.width = `${percentage}%`
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs < 10 ? '0' + secs : secs}`
  }

  this.onchange = (prop) => {
    if (prop === 'nowPlaying') initAudio()
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
            ${formatTime(this.audio ? this.audio.currentTime : 0)}
          </div>
          <div class="player-controls-progress-bar" onclick="${onprogressclick}" :ref="${(e) => (progressBar = e)}">
            <div class="player-controls-progress-fill" :ref="${(e) => (progressFill = e)}"></div>
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

  this.selectedAudio = null
  this.selectedFolders = new Map()
  this.showSettings = false

  this.onchange = (prop) => {
    if (prop === 'selectedAudio') {
      const oldSelectedAudioElement = document.querySelector('.audio-item.selected')
      if (oldSelectedAudioElement) {
        oldSelectedAudioElement.classList.remove('selected')
      }

      if (this.selectedAudio) {
        const newSelectedAudioElement = document.getElementById(this.selectedAudio.path)
        if (newSelectedAudioElement) {
          newSelectedAudioElement.classList.add('selected')
        }
      }
    }
  }

  return (render) => render`
    <>
      <Header />
      <Content selectedFolders="${this.selectedFolders}" />
      <Player nowPlaying="${this.selectedAudio}" />
    </>
  `
}

function init() {
  window.addEventListener('DOMContentLoaded', () => {
    lemonade.setComponents({ Header, Content, Player, AudioSection, AudioItem })
    lemonade.render(Root, document.getElementById('app'))
  })
}

init()
