import { ensureDirSync, readJsonSync, writeJsonSync } from 'fs-extra'
import { join } from 'path-extra'

/*
   state persistence: the following paths are kept and restored at runtime:

   - extStore.ui
   - extStore.gameUpdate

 */
const stateToPState = ({ui, gameUpdate}) => ({
  ui,
  gameUpdate,
  // TODO: sync with package version (p-state-0.0.1)
  $dataVersion: 'initial-b',
})

const getPStateFilePath = () => {
  const {APPDATA_PATH} = window
  const path = join(APPDATA_PATH,'navy-album')
  ensureDirSync(path)
  return join(path,'p-state.json')
}

const savePState = pState => {
  const path = getPStateFilePath()
  try {
    writeJsonSync(path,pState)
  } catch (err) {
    console.error('Error while writing to p-state file', err)
  }
}

const updatePState = oldPState => {
  if (oldPState.$dataVersion === 'initial-b')
    return oldPState

  if (oldPState.$dataVersion === 'initial-a') {
    const newPState = oldPState
    newPState.gameUpdate = {
      summary: null,
      digest: null,
      ready: true,
    }
    newPState.$dataVersion = 'initial-b'
    return newPState
  }

  throw new Error('failed to update the config')
}

const loadPState = () => {
  try {
    return updatePState(readJsonSync(getPStateFilePath()))
  } catch (err) {
    if (err.syscall !== 'open' || err.code !== 'ENOENT') {
      console.error('Error while loading config', err)
    }
  }
  return null
}

export { stateToPState, savePState, loadPState }
