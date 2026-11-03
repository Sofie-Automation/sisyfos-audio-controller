import React, { ChangeEvent } from 'react'

import '../assets/css/PagesSettings.css'
import { Store } from 'redux'
import { connect } from 'react-redux'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Fader } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import Select from 'react-select'
import {
    SOCKET_GET_PAGES_LIST,
    SOCKET_SET_PAGES_LIST,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { CustomPages } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { SortableFaderList } from './SortableFaderList'

const selectorColorStyles = {
    control: (styles: any) => ({
        ...styles,
        backgroundColor: '#676767',
        color: 'white',
        border: 0,
        width: '100%',
    }),
    option: (_styles: any) => ({
        backgroundColor: '#AAAAAA',
        color: 'white',
    }),
    singleValue: (styles: any) => ({ ...styles, color: 'white' }),
}

interface PagesSettingsInjectProps {
    customPages: CustomPages[]
    fader: Fader[]
}

class PagesSettings extends React.PureComponent<
    PagesSettingsInjectProps & Store
> {
    pageList: { id: string; label: string; value: number }[]
    private scrollContainerRef = React.createRef<HTMLDivElement>()
    private fileInputRef = React.createRef<HTMLInputElement>()
    state = { id: '', pageIndex: 0, label: '' }

    constructor(props: any) {
        super(props)
        this.pageList = this.props.customPages.map(
            (page: CustomPages, index: number) => ({
                id: page.id,
                label: page.label,
                value: index,
            })
        )
    }

    componentDidMount() {
        const { id, label } = this.props.customPages[0]
        this.setState({ id, label })
    }

    handleSelectPage = (event: any) => {
        const { id, label } = this.props.customPages[event.value]
        this.setState({ pageIndex: event.value, id, label })
    }

    handleProperty = (
        property: 'id' | 'label',
        event: ChangeEvent<HTMLInputElement>
    ) => {
        this.setState({ [property]: event.target.value })
        this.pageList[this.state.pageIndex][property] = event.target.value
        const nextPages = this.pagesWithUpdate((page) => {
            page[property] = event.target.value
        })
        this.dispatch(nextPages)
    }

    handleReorder = (newFaders: number[]) => {
        const nextPages = this.pagesWithUpdate((page) => {
            page.faders = newFaders
        })
        this.dispatch(nextPages)
    }

    handleAdd = (faderIndex: number) => {
        const nextPages = this.pagesWithUpdate((page) => {
            page.faders = [...page.faders, faderIndex]
        })
        this.dispatch(nextPages)
    }

    handleRemove = (faderIndex: number) => {
        const nextPages = this.pagesWithUpdate((page) => {
            page.faders = page.faders.filter((f) => f !== faderIndex)
        })
        this.dispatch(nextPages)
    }

    handleSort = () => {
        const nextPages = this.pagesWithUpdate((page) => {
            page.faders = [...page.faders].sort((a, b) => a - b)
        })
        this.dispatch(nextPages)
    }

    handleClear = () => {
        if (!window.confirm('REMOVE ALL FADER ASSIGNMENTS????')) return
        const nextPages = this.pagesWithUpdate((page) => {
            page.faders = []
        })
        this.dispatch(nextPages)
    }

    handleDownload = () => {
        const a = document.createElement('a')
        a.href = '/api/pages'
        a.download = 'pages.json'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    handleUploadClick = () => {
        this.fileInputRef.current?.click()
    }

    handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''
        file.text().then((text) => {
            let parsed: any
            try {
                parsed = JSON.parse(text)
            } catch {
                window.alert('Could not parse file')
                return
            }
            if (
                !Array.isArray(parsed) ||
                !parsed.every(
                    (p: any) =>
                        typeof p.id === 'string' &&
                        typeof p.label === 'string' &&
                        Array.isArray(p.faders)
                )
            ) {
                window.alert('Invalid pages format')
                return
            }
            fetch('/api/pages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: text,
            })
                .then((res) => {
                    if (!res.ok)
                        window.alert(`Import failed: ${res.statusText}`)
                })
                .catch((err) => {
                    window.alert(`Import error: ${err}`)
                })
        })
    }

    handleClose = () => {
        window.socketIoClient.emit(SOCKET_GET_PAGES_LIST)
        window.storeRedux.dispatch({
            type: SettingsActionTypes.TOGGLE_SHOW_PAGES_SETUP,
        })
    }

    private pagesWithUpdate(
        updater: (page: CustomPages) => void
    ): CustomPages[] {
        const nextPages: CustomPages[] = this.props.customPages.map((p) => ({
            ...p,
            faders: [...p.faders],
        }))
        updater(nextPages[this.state.pageIndex])
        return nextPages
    }

    private dispatch(nextPages: CustomPages[]) {
        window.storeRedux.dispatch({
            type: SettingsActionTypes.SET_PAGES_LIST,
            customPages: nextPages,
        })
        window.socketIoClient.emit(SOCKET_SET_PAGES_LIST, nextPages)
    }

    render() {
        const { customPages, fader } = this.props
        const { pageIndex, id, label } = this.state
        const currentPage = customPages[pageIndex]

        return (
            <div className="pages-settings-body" ref={this.scrollContainerRef}>
                <h2>CUSTOM PAGES</h2>
                <button className="close" onClick={this.handleClose}>
                    X
                </button>
                <div className="pages-settings-action-row">
                    <button
                        className="pages-settings-sort-btn"
                        onClick={this.handleDownload}
                    >
                        EXPORT ALL PAGES
                    </button>
                    <button
                        className="pages-settings-sort-btn"
                        onClick={this.handleUploadClick}
                    >
                        IMPORT ALL PAGES
                    </button>
                </div>
                <input
                    ref={this.fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    style={{ display: 'none' }}
                    onChange={this.handleFileChange}
                />

                <Select
                    styles={selectorColorStyles}
                    value={{
                        label: currentPage.label || `Page : ${pageIndex + 1}`,
                        value: pageIndex,
                    }}
                    onChange={this.handleSelectPage}
                    options={this.pageList}
                />

                <label className="inputfield">
                    ID :
                    <input
                        type="text"
                        value={id}
                        onChange={(e) => this.handleProperty('id', e)}
                    />
                </label>
                <br />
                <label className="inputfield">
                    LABEL :
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => this.handleProperty('label', e)}
                    />
                </label>
                <br />

                <SortableFaderList
                    faderIndices={currentPage.faders}
                    totalFaders={fader.length}
                    scrollContainerRef={this.scrollContainerRef}
                    onReorder={this.handleReorder}
                    onRemove={this.handleRemove}
                    onAdd={this.handleAdd}
                    onSort={this.handleSort}
                    onClear={this.handleClear}
                />
                <br />
            </div>
        )
    }
}

const mapStateToProps = (state: any): PagesSettingsInjectProps => ({
    customPages: state.settings[0].customPages,
    fader: state.faders[0].fader,
})

export default connect<any, PagesSettingsInjectProps>(mapStateToProps)(
    PagesSettings
) as any
