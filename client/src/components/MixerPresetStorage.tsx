import React, { useState, useEffect, useRef } from 'react'
import {
    SOCKET_GET_MIXER_PRESET_LIST,
    SOCKET_RETURN_MIXER_PRESET_LIST,
    SOCKET_LOAD_MIXER_PRESET,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'

const MixerPresetStorage: React.FC = () => {
    const [presetList, setPresetList] = useState<string[]>(
        window.mixerPresetList ?? []
    )
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        window.socketIoClient.emit(SOCKET_GET_MIXER_PRESET_LIST)

        const handlePresetList = (payload: string[]) => {
            window.mixerPresetList = payload
            setPresetList(payload)
        }
        window.socketIoClient.on(
            SOCKET_RETURN_MIXER_PRESET_LIST,
            handlePresetList
        )

        return () => {
            window.socketIoClient.off(
                SOCKET_RETURN_MIXER_PRESET_LIST,
                handlePresetList
            )
        }
    }, [])

    const refreshList = () => {
        window.socketIoClient.emit(SOCKET_GET_MIXER_PRESET_LIST)
    }

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const fileName = file.name
        if (window.confirm(`Upload preset "${fileName}" to server?`)) {
            file.arrayBuffer().then((buffer) => {
                fetch(`/api/mixer-preset/${encodeURIComponent(fileName)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    body: buffer,
                })
                    .then((res) => {
                        if (!res.ok) {
                            window.alert(`Upload failed: ${res.statusText}`)
                        }
                        refreshList()
                    })
                    .catch((err) => {
                        window.alert(`Upload error: ${err}`)
                    })
            })
        }
        // Reset so the same file can be re-uploaded
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleDownload = (fileName: string) => {
        const a = document.createElement('a')
        a.href = `/api/mixer-preset/${encodeURIComponent(fileName)}`
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    const handleLoad = (fileName: string) => {
        if (window.confirm(`Load mixer preset "${fileName}"?`)) {
            window.socketIoClient.emit(SOCKET_LOAD_MIXER_PRESET, fileName)
        }
    }

    const handleDelete = (fileName: string) => {
        if (
            window.confirm(
                `Are you sure you want to delete preset "${fileName}"?`
            )
        ) {
            fetch(`/api/mixer-preset/${encodeURIComponent(fileName)}`, {
                method: 'DELETE',
            })
                .then((res) => {
                    if (!res.ok) {
                        window.alert(`Delete failed: ${res.statusText}`)
                    }
                    refreshList()
                })
                .catch((err) => {
                    window.alert(`Delete error: ${err}`)
                })
        }
    }

    const supportsPresets = !!window.mixerProtocol?.presetFileExtension

    if (!supportsPresets && presetList.length === 0) {
        return null
    }

    return (
        <React.Fragment>
            <br />
            <hr />
            <h3>MIXER PRESETS :</h3>
            <div className="preset-upload-area">
                <label
                    htmlFor="mixer-preset-upload"
                    className="preset-upload-button"
                >
                    IMPORT
                </label>
                <input
                    id="mixer-preset-upload"
                    ref={fileInputRef}
                    type="file"
                    className="hidden-file-input"
                    onChange={handleUpload}
                />
            </div>
            {presetList.length > 0 ? (
                <ul className="storage-list preset-storage-list">
                    {presetList.map((file, index) => (
                        <li key={index} className="preset-item">
                            <span className="preset-name">{file}</span>
                            <div className="preset-actions">
                                <button
                                    className="preset-action-button"
                                    onClick={() => handleLoad(file)}
                                >
                                    LOAD
                                </button>
                                <button
                                    className="preset-action-button"
                                    onClick={() => handleDownload(file)}
                                >
                                    EXPORT
                                </button>
                                <button
                                    className="preset-action-button preset-delete-button"
                                    onClick={() => handleDelete(file)}
                                >
                                    DELETE
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="no-presets-message">No preset files found</p>
            )}
        </React.Fragment>
    )
}

export default MixerPresetStorage
