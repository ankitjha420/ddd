varying vec2 vUv;
uniform float time;
uniform sampler2D uPositions;
attribute vec2 reference;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vec3 pos = texture2D(uPositions, reference).xyz;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 100.0 * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}