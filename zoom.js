// Type Matrix is [ [a00, a10], [a01, a11] ]
// Type Vector is [ x, y ]
// Type Transform is [ Matrix, Vector ]

/**
 * Multiply Scalar with Vector returns a Vector.
 * 
 * @param {number} l scalar to multiply with
 * @param {Array<number>} x 2D vector.
 * @return {Array<number>}
 */
var scmult = function(l, x) {
    return [ l * x[0], l * x[1] ];
};

/**
 * Adding two vectors is another vector.
 * 
 * @param {Array<number>} a 2D vector.
 * @param {Array<number>} b 2D vector.
 * @return {Array<number>} Sum vector.
 */
var vcadd = function(a, b) {
    return [ a[0] + b[0], a[1] + b[1] ];
};

/**
 * Subtracting two vectors is another vector.
 * 
 * @param {Array<number>} a 2D vector.
 * @param {Array<number>} b 2D vector.
 * @return {Array<number>} Difference vector.
 */
var minus = function(a, b) {
    return [ a[0] - b[0], a[1] - b[1] ];
};

/**
 * Dot product of two vectors is scalar.
 * 
 * @param {Array<number>} a 2D vector.
 * @param {Array<number>} b 2D vector.
 * @return {number} scalar inner product.
 */
var dot = function(a, b) {
    return a[0] * b[0] + a[1] * b[1];
};

/**
 * Exterior Product of two vectors is a pseudoscalar.
 * 
 * @param {Array<number>} a 2D vector.
 * @param {Array<number>} b 2D vector.
 * @return {number} psuedo-scalar exterior product.
 */
var wedge = function(a, b) {
    return a[0] * b[1] - a[1] * b[0];
};

/**
 * Apply Matrix on Vector returns a Vector.
 * 
 * @param {Array<Array<number>>} A 2x2 Matrix
 * @param {Array<number>} x 2D vector.
 * @return {Array<number>} 2D vector linear product.
 */
var apply = function(A, x) {
    return vcadd(scmult(x[0], A[0]), scmult(x[1], A[1]));
};

/**
 * Multiply two matrices.
 * 
 * @param {Array<Array<number>>} A 2x2 Matrix
 * @param {Array<Array<number>>} B 2x2 Matrix
 * @return {Array<Array<number>>} A 2x2 Matrix
 */
var mult = function(A, B) {
    return [ apply(A, B[0]), apply(A, B[1]) ];
};

/**
 * Represents a transform operation, Ax + b
 * 
 * @constructor
 * 
 * @param {Array<Array<number>>} A 2x2 Matrix.
 * @param {Array<number>} b 2D scalar.
 */
function Transform(A, b) {
    this.A = A;
    this.b = b;
}

/**
 * Given CSS Transform representation of the class.
 * @return {string} CSS 2D Transform. 
 */
Transform.prototype.css = function() {
    var A = this.A;
    var b = this.b;
    return 'matrix(' + A[0][0] + ',' + A[0][1] + ',' + A[1][0] + ',' + A[1][1] +
            ',' + b[0] + ',' + b[1] + ')';
};

/**
 * Multiply two transforms. 
 * Defined as 
 *  (T o U) (x) = T(U(x))
 * 
 * Derivation:
 *  T(U(x)) 
 *   = T(U.A(x) + U.b) 
 *   = T.A(U.A(x) + U.b)) + T.b
 *   = T.A(U.A(x)) + T.A(U.b) + T.b 
 * 
 * @param {Transform} T 
 * @param {Transform} U 
 * @return {Transform} T o U
 */
var cascade = function(T, U) {
    return new Transform(mult(T.A, U.A), vcadd(apply(T.A, U.b), T.b));
};

/**
 * Creates the default rotation matrix
 * 
 * @param {number} c x-projection (r cos(theta))
 * @param {number} s y-projection (r sin(theta))
 * @return {Array<Array<number>>} Rotation matrix.
 */
var rotate = function(c, s) {
    return [ [ c, s], [-s, c] ];
};

/**
 * Returns matrix that transforms vector a to vector b.
 * 
 * @param {Array<number>} a 2D vector.
 * @param {Array<number>} b 2D vector.
 * @return {Array<Array<number>>} Rotation + Scale matrix
 */
var rotscale = function(a, b) {
    var alen = dot(a, a);
    var sig = dot(a, b);
    var del = wedge(a, b);
    return rotate( sig / alen, del / alen);
};

/**
 * Zoom is a similarity preserving transform from a pair of
 * positions vectors to a new pair of position vectors.
 * 
 * @param {Array<number>} s source point.
 * @param {Array<number>} d destination point.
 * 
 * @return {Transform} that moves point 's' to point 'd' 
 */ 
var zoom = function(s, d) {
    var a = minus(s[1], s[0]);
    var b = minus(d[1], d[0]);
    var rs = rotscale(a, b);

    var rs0 = apply(rs, s[0]);
    var t = minus(d[0], rs0);

    return [rs, t];
};

var identity = [ [ [ 1, 0], [0, 1]] , [0, 0] ];

/**
 * @constructor
 * @export
 * @param {Element} elem to attach zoom handler.
 */
function Zoom(elem) {
    this.elem = elem;
    this.zooming = false;
    this.activeZoom = identity;
    this.currentZoom = null;
    this.srcCoords = [0, 0];

    var me = this;
    var tapped = false;

    elem.style['transform-origin'] = '0 0';

    var getCoords = function(t) {
        var oX = elem.offsetLeft;
        var oY = elem.offsetTop; 
        return [ 
            [t[0].pageX - oX, t[0].pageY - oY],
            [t[1].pageX - oX, t[1].pageY - oY] 
        ];
    };

    elem.parentNode.addEventListener('touchstart', function(evt) {
        var t = evt.touches;
        if (!t) {
            return false;
        }
        evt.preventDefault();
        if (t.length === 2) {
            me.srcCoords = getCoords(t);
            me.zooming = true;
        } else if (t.length == 1) {
            if (!tapped) {
                tapped = setTimeout(function() {
                    tapped = false;
                }, 300);
            } else {
                tapped = false;
                me.reset();
            }
        }
    });
    
    elem.parentNode.addEventListener('touchmove', function(evt) {
        var t = evt.touches;
        if (!t || t.length != 2) {
            return false;
        }
        if (!me.zooming) {
            // To prevent possible potential reorder of events.
            return false;
        }
        evt.preventDefault();
        var destCoords = getCoords(t);
        me.currentZoom = zoom(me.srcCoords, destCoords);
        var finalT = cascade(me.currentZoom, me.activeZoom);
        me.update(finalT);
    });

    elem.parentNode.addEventListener('touchend', function() {
        if (me.zooming) {
            me.activeZoom = cascade(me.currentZoom, me.activeZoom);
            me.zooming = false;
        }
    });
}

Zoom.prototype.update = function(finalT) {
    var str = cssMat(finalT);
    this.elem.style.transform = str;
};

Zoom.prototype.reset = function() {
    if (window.requestAnimationFrame) {
        var Z = this.activeZoom;
        var I = identity;
        var startTime = null;

        var avgVector = function(u, v, progress) {
            var u1 = scmult(1 - progress, u);
            var v1 = scmult(progress, v);
            return vcadd(u1, v1);
        };
        var avgTransform = function(Z, I, progress) {
            return [ [
                avgVector(Z[0][0], I[0][0], progress), 
                avgVector(Z[0][1], I[0][1], progress),
            ],
                avgVector(Z[1], I[1], progress)
            ];
        };
        var me = this;
        var step = function(time) {
            if (!startTime) { 
                startTime =  time;
            }
            var progress = (time - startTime)/100;
            if (progress > 1) {
                me.activeZoom = identity;
                me.zooming = false;
                me.update(me.activeZoom);
            } else {
                me.update(avgTransform(Z, I, progress));
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    } else {
        this.activeZoom = identity;
        this.zooming = false;
        this.update(this.activeZoom);
    }
};
Zoom.prototype['reset'] = Zoom.prototype.reset;

window['Zoom'] = Zoom;
