import gsap from 'gsap'

interface MousePos {
    x: number
    y: number
}

export default class Cursor {
    icon: HTMLElement
    mouse: MousePos = { x: 0, y: 0 }

    constructor(icon: HTMLElement) {
        this.icon = icon
        this.bindEvents()
    }

    bindEvents(): void {
        const menu = document.querySelector('div.menu')
        const rect = menu!.getBoundingClientRect()
        const x = rect.x + rect.width
        const y = rect.y + rect.height
        window.addEventListener('mousemove', (e: MouseEvent) => {
            this.mouse.x = e.clientX
            this.mouse.y = e.clientY

            gsap.to(this.icon, {
                x: this.mouse.x,
                y: this.mouse.y,
                duration: 0.3,
                ease: 'power3.out'
            })
            if (this.mouse.x < x && this.mouse.y < y) {
                gsap.to(this.icon, {
                    scale: 4,
                    rotate: 270,
                    duration: 0.3,
                    ease: 'power2.out'
                })
            } else {
                gsap.to(this.icon, {
                    scale: 1,
                    rotate: 45,
                    duration: 0.3,
                    ease: 'power2.out'
                })
            }
        })
    }
}
