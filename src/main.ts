import { Sketch } from './components/sketch'

import Cursor from './components/cursor.ts'

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas')
    const cursorIcon = document.getElementById('cursor')
    const loading = document.getElementById('loading')

    if (cursorIcon) {
        new Cursor(cursorIcon)
    }

    if (canvas) {
        new Sketch(canvas as HTMLCanvasElement)
        loading?.classList?.add('done')
    }
})