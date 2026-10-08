// Isometric artwork faces are mapped back to a rectangle. The reference faces
// are approximately affine quads; bilinear mapping also handles their small
// deviations from a parallelogram without a diagonal seam.
export function sourcePoint(quad, u, v) {
  const [tl, tr, br, bl] = quad;
  return [0, 1].map(k => (1-v)*((1-u)*tl[k]+u*tr[k])+v*((1-u)*bl[k]+u*br[k]));
}
export function sampleBilinear(data, width, height, x, y) {
  x = Math.max(0, Math.min(width - 1, x)); y = Math.max(0, Math.min(height - 1, y));
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(x0+1,width-1), y1 = Math.min(y0+1,height-1);
  const tx = x-x0, ty = y-y0;
  return [0,1,2].map(c => {
    const a=data[(y0*width+x0)*4+c]*(1-tx)+data[(y0*width+x1)*4+c]*tx;
    const b=data[(y1*width+x0)*4+c]*(1-tx)+data[(y1*width+x1)*4+c]*tx;
    return a*(1-ty)+b*ty;
  });
}
