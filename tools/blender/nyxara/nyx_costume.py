"""Nyxara — costume : coques issues du corps, filets d'or, chaînes, panneaux de tissu."""
import bpy, bmesh, math, random, mathutils
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree


def smooth(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


def mk_mat(name, rgb, metallic=0.0, rough=0.5, emit=None, alpha=1.0, emit_strength=1.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = emit_strength
    if alpha < 1.0:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND"
    m.diffuse_color = (*rgb, alpha)
    m.metallic, m.roughness = metallic, rough
    return m


# --------------------------------------------------------------------------- coques
def shell(body, name, pred, offset, mat, scene, keep_weights=True):
    """Duplique les faces du corps qui vérifient pred(face, bm, dl) et les décale le long des normales."""
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bm.faces.ensure_lookup_table()
    dl = bm.verts.layers.deform.active
    kill = [f for f in bm.faces if not pred(f, dl)]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * offset
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    for g in body.vertex_groups:
        ob.vertex_groups.new(name=g.name)
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    return ob


def group_weight(v, dl, gidx):
    d = v[dl]
    return sum(d.get(i, 0.0) for i in gidx)


def gindex(body, names):
    want = set(names)
    return [g.index for g in body.vertex_groups if g.name in want]


def boundary_loops(ob):
    """Boucles ordonnées d'arêtes de bord d'un objet mesh (coordonnées locales)."""
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bm.edges.ensure_lookup_table()
    adj = {}
    for e in bm.edges:
        if len(e.link_faces) == 1:
            a, b = e.verts[0].index, e.verts[1].index
            adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a)
    seen, loops = set(), []
    pos = {v.index: v.co.copy() for v in bm.verts}
    for start in list(adj):
        if start in seen:
            continue
        loop, cur, prev = [start], start, None
        seen.add(start)
        while True:
            nxt = [n for n in adj[cur] if n != prev and n not in seen]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            seen.add(cur); loop.append(cur)
        if len(loop) > 4:
            loops.append([pos[i] for i in loop])
    bm.free()
    return loops


def smooth_polyline(pts, iters=3):
    pts = [p.copy() for p in pts]
    for _ in range(iters):
        new = [pts[0].copy()]
        for i in range(1, len(pts) - 1):
            new.append((pts[i - 1] + pts[i] * 2 + pts[i + 1]) * 0.25)
        new.append(pts[-1].copy())
        pts = new
    return pts


def add_curve_obj(scene, name, polylines, mat, radius=0.0016, cyclic=False, res=0, taper=None):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = res
    for pts in polylines:
        if len(pts) < 2:
            continue
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for i, p in enumerate(pts):
            sp.points[i].co = (p.x, p.y, p.z, 1)
            if taper:
                sp.points[i].radius = taper(i / (len(pts) - 1))
        sp.use_cyclic_u = cyclic
    cu.materials.append(mat)
    ob = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(ob)
    return ob


def curve_to_mesh(ob, scene):
    dg = bpy.context.evaluated_depsgraph_get()
    eo = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(eo)
    new = bpy.data.objects.new(ob.name + "_m", me)
    scene.collection.objects.link(new)
    for m in ob.data.materials:
        new.data.materials.append(m)
    bpy.data.objects.remove(ob, do_unlink=True)
    return new


# --------------------------------------------------------------------------- poids par proximité
def transfer_weights(src, dst, only_groups=None):
    """Copie les poids du corps vers un objet par interpolation des sommets de la face la plus proche."""
    dg = bpy.context.evaluated_depsgraph_get()
    bm = bmesh.new(); bm.from_mesh(src.data)
    bvh = BVHTree.FromBMesh(bm)
    bm.faces.ensure_lookup_table()
    dl = bm.verts.layers.deform.active
    names = {g.index: g.name for g in src.vertex_groups}
    keep = set(only_groups) if only_groups else None
    for g in src.vertex_groups:
        if (keep is None or g.name in keep) and g.name not in dst.vertex_groups:
            dst.vertex_groups.new(name=g.name)
    for v in dst.data.vertices:
        p = dst.matrix_world @ v.co
        loc, nor, idx, dist = bvh.find_nearest(p)
        if idx is None:
            continue
        f = bm.faces[idx]
        acc = {}
        tot = 0.0
        for fv in f.verts:
            w = 1.0 / (0.002 + (fv.co - loc).length)
            tot += w
            for gi, gw in fv[dl].items():
                acc[gi] = acc.get(gi, 0.0) + gw * w
        for gi, gw in acc.items():
            n = names[gi]
            if keep is not None and n not in keep:
                continue
            if gw / tot > 0.003:
                dst.vertex_groups[n].add([v.index], gw / tot, "REPLACE")
    bm.free()


def weight_all(dst, bone, groups=None):
    g = dst.vertex_groups.get(bone) or dst.vertex_groups.new(name=bone)
    g.add([v.index for v in dst.data.vertices], 1.0, "REPLACE")


# --------------------------------------------------------------------------- treillis d'or
def surface_hit(bvh, origin, direction, maxd=2.0):
    h = bvh.ray_cast(origin, direction, maxd)
    return h if h[0] is not None else None


def lattice_lines(bvh, axis_pt_fn, z0, z1, n_lines, twist, steps, accept, offset=0.003, angle_range=(0, 2 * math.pi), families=(1, -1)):
    """Hélices croisées projetées sur la surface -> liste de polylignes."""
    lines = []
    for fam in families:
        for i in range(n_lines):
            th0 = angle_range[0] + (angle_range[1] - angle_range[0]) * i / n_lines
            cur = []
            for s in range(steps + 1):
                t = s / steps
                z = z0 + (z1 - z0) * t
                th = th0 + fam * twist * t
                c = axis_pt_fn(z)
                d = Vector((math.sin(th), -math.cos(th), 0.0))
                o = c + d * 0.6
                h = bvh.ray_cast(o, -d, 0.8)
                if h[0] is None or not accept(h[0], h[1]):
                    if len(cur) > 1:
                        lines.append(cur)
                    cur = []
                    continue
                cur.append(h[0] + h[1] * offset)
            if len(cur) > 1:
                lines.append(cur)
    return lines


# --------------------------------------------------------------------------- tissu
def panel(scene, name, top_fn, nu, nv, length_fn, offset_fn, mat_body, mat_hem, hem_frac=0.10, jag=0.08, seed=1, wave=0.02):
    """Panneau de tissu déchiré : top_fn(u)->(Vector, Vector dir_down) ; length_fn(u)->L ; offset_fn(u, v)->Vector décalage."""
    rng = random.Random(seed)
    bm = bmesh.new()
    rows = []
    jag_tab = [rng.uniform(0, 1) for _ in range(nu + 2)]
    for j in range(nv + 1):
        v = j / nv
        row = []
        for i in range(nu + 1):
            u = i / nu
            top, dn = top_fn(u)
            L = length_fn(u)
            # bord bas déchiqueté : longueur réduite par une dent de scie aléatoire
            tooth = (jag_tab[i] * 0.6 + (jag_tab[i + 1] if i % 2 else 0) * 0.4) * jag * L
            Lu = L - tooth * smooth((v - 0.72) / 0.28)
            p = top + dn * (Lu * v) + offset_fn(u, v) + Vector((wave * math.sin(u * 17 + v * 5 + seed), wave * 0.6 * math.sin(u * 11 + v * 7 + seed * 2), 0)) * v
            row.append(bm.verts.new(p))
        rows.append(row)
    uvl = bm.loops.layers.uv.new("UVMap")
    for j in range(nv):
        for i in range(nu):
            vs = (rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i])
            f = bm.faces.new(vs)
            f.smooth = True
            f.material_index = 1 if (j / nv) > (1 - hem_frac) else 0
            for l, (ii, jj) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                l[uvl].uv = (ii / nu * 3.0, jj / nv * 8.0)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    me.materials.append(mat_body)
    me.materials.append(mat_hem)
    return ob


# --------------------------------------------------------------------------- bords lissés
def relax_boundary(ob, iters=6, lam=0.5):
    """Lisse les boucles de bord d'une coque (supprime l'effet d'escalier)."""
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bm.edges.ensure_lookup_table()
    adj = {}
    for e in bm.edges:
        if len(e.link_faces) == 1:
            a, b = e.verts[0].index, e.verts[1].index
            adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a)
    bm.verts.ensure_lookup_table()
    for _ in range(iters):
        new = {}
        for i, nb in adj.items():
            if len(nb) == 2:
                avg = (bm.verts[nb[0]].co + bm.verts[nb[1]].co) * 0.5
                new[i] = bm.verts[i].co.lerp(avg, lam)
        for i, p in new.items():
            bm.verts[i].co = p
    bm.to_mesh(ob.data); bm.free()


# --------------------------------------------------------------------------- tissu paramétrique
def cloth(scene, name, pos_fn, nu, nv, mat_body, mat_hem, hem_frac=0.09, jag=0.10, seed=1, closed_u=False):
    """pos_fn(u, v, tooth) -> Vector. tooth in [0,1] réduit la longueur en bas (bord déchiré)."""
    rng = random.Random(seed)
    teeth = [rng.uniform(0, 1) ** 1.3 for _ in range(nu + 2)]
    for _ in range(3):
        teeth = [teeth[0]] + [(teeth[i - 1] + 2 * teeth[i] + teeth[i + 1]) * 0.25 for i in range(1, len(teeth) - 1)] + [teeth[-1]]
    bm = bmesh.new()
    rows = []
    for j in range(nv + 1):
        v = j / nv
        row = []
        for i in range(nu + 1):
            u = i / nu
            t = (teeth[i] * 0.55 + teeth[(i + 1) % (nu + 1)] * 0.45) * jag
            row.append(bm.verts.new(pos_fn(u, v, t)))
        rows.append(row)
    for j in range(nv):
        for i in range(nu):
            f = bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
            f.smooth = True
            f.material_index = 1 if (j / nv) > (1 - hem_frac) else 0
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    me.materials.append(mat_body)
    me.materials.append(mat_hem)
    return ob


def add_gem_mesh(scene, name, loc, size, mat, sx=0.55, sz=1.25):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size * sx, v.co.y * size * sx, v.co.z * size * sz)) + loc
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); me.materials.append(mat)
    return ob


def merge_meshes(objs, name, scene):
    """Fusionne des objets mesh (mêmes espaces) en un seul ; conserve matériaux et groupes."""
    objs = [o for o in objs if o and o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = name
    return objs[0]



# --------------------------------------------------------------------------- filigrane organique (cellules de Voronoï)
def voronoi_tube(bvh, a, b, r_eff, spacing, ang0, ang1, accept, offset_fn, seed=1, jitter=0.33, subdiv=3, max_axis_dist=None):
    """Cellules de Voronoï dans l'espace (arc, longueur) d'un tube a->b, projetées sur la surface.
    Retourne (polylignes, noeuds) ; les noeuds sont des tuples (position, normale)."""
    import numpy as np
    from scipy.spatial import Voronoi
    rng = np.random.RandomState(seed)
    ax = (b - a)
    L = ax.length
    ax = ax.normalized()
    front = Vector((0, -1, 0))
    u0 = front - ax * front.dot(ax)
    u0 = u0.normalized() if u0.length > 1e-4 else Vector((1, 0, 0))
    w0 = ax.cross(u0).normalized()
    s0, s1 = ang0 * r_eff, ang1 * r_eff
    pts = []
    ny = int(L / (spacing * 0.866)) + 3
    nx = int((s1 - s0) / spacing) + 3
    for j in range(-1, ny):
        for i in range(-1, nx):
            s = s0 + (i + 0.5 * (j % 2)) * spacing + rng.uniform(-jitter, jitter) * spacing
            l = j * spacing * 0.866 + rng.uniform(-jitter, jitter) * spacing
            pts.append((s, l))
    vor = Voronoi(np.array(pts))

    def to3d(s, l):
        th = s / r_eff
        cc = a + ax * l
        d = u0 * math.cos(th) + w0 * math.sin(th)
        h = bvh.ray_cast(cc + d * 0.6, -d, 0.8)
        if h[0] is None:
            return None
        p, n = h[0], h[1]
        if max_axis_dist is not None:
            rel = p - a
            radial = rel - ax * rel.dot(ax)
            if radial.length > max_axis_dist:
                return None
        if not accept(p, n):
            return None
        return (p + n * offset_fn(p), n)

    V = vor.vertices
    lines, nodes = [], {}
    for (i0, i1) in vor.ridge_vertices:
        if i0 < 0 or i1 < 0:
            continue
        p0, p1 = V[i0], V[i1]
        if not (s0 <= p0[0] <= s1 and s0 <= p1[0] <= s1 and 0.0 <= p0[1] <= L and 0.0 <= p1[1] <= L):
            continue
        seg = []
        for k in range(subdiv + 1):
            t = k / subdiv
            q = to3d(p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t)
            if q is None:
                seg = None
                break
            seg.append(q)
        if seg is None:
            continue
        lines.append([q[0] for q in seg])
        nodes[i0] = seg[0]
        nodes[i1] = seg[-1]
    return lines, list(nodes.values())


def add_octa(bm, loc, size, up=None, stretch=1.25):
    """Gemme taillée basse définition (octaèdre allongé, 8 triangles)."""
    up = (up or Vector((0, 0, 1))).normalized()
    t = up.cross(Vector((1, 0, 0)))
    if t.length < 1e-3:
        t = up.cross(Vector((0, 1, 0)))
    t = t.normalized()
    b = up.cross(t).normalized()
    top = bm.verts.new(loc + up * size * stretch)
    bot = bm.verts.new(loc - up * size * stretch)
    ring = [bm.verts.new(loc + (t * math.cos(a) + b * math.sin(a)) * size * 0.62) for a in (0.0, math.pi / 2, math.pi, 1.5 * math.pi)]
    for i in range(4):
        bm.faces.new((ring[i], ring[(i + 1) % 4], top))
        bm.faces.new((ring[(i + 1) % 4], ring[i], bot))


# --------------------------------------------------------------------------- tissu déchiqueté en lanières
def tattered(scene, name, pos_fn, nu, nv, n_strips, v_split, seed, mat_body, mat_hem,
             len_min=0.70, len_max=1.04, gap=0.22, hem_frac=0.30, uv_scale=(3.0, 8.0)):
    """Haut continu (v < v_split), bas découpé en lanières de longueurs inégales à pointe effilée."""
    rng = random.Random(seed)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")

    def grid(u0, u1, v0, v1, cols, rows, tip=None, hem_from=None, wob=None):
        rows_v = []
        for j in range(rows + 1):
            v = v0 + (v1 - v0) * j / rows
            row = []
            for i in range(cols + 1):
                u = u0 + (u1 - u0) * i / cols
                if tip is not None and v1 > tip:
                    uc = 0.5 * (u0 + u1)
                    u = uc + (u - uc) * (1.0 - 0.88 * smooth((v - tip) / (v1 - tip)))
                p = pos_fn(u, v, 0.0)
                if wob is not None:
                    p = p + wob(v)
                row.append((bm.verts.new(p), u, v))
            rows_v.append(row)
        for j in range(rows):
            for i in range(cols):
                q = (rows_v[j][i], rows_v[j][i + 1], rows_v[j + 1][i + 1], rows_v[j + 1][i])
                f = bm.faces.new([e[0] for e in q])
                f.smooth = True
                vmid = 0.5 * (q[0][2] + q[2][2])
                f.material_index = 1 if (hem_from is not None and vmid > hem_from) else 0
                for lp, e in zip(f.loops, q):
                    lp[uvl].uv = (e[1] * uv_scale[0], e[2] * uv_scale[1])

    grid(0.0, 1.0, 0.0, v_split, nu, max(2, int(round(nv * v_split))))
    w = 1.0 / n_strips
    for k in range(n_strips):
        ua = k * w + w * gap * 0.5 * rng.uniform(0.5, 1.5)
        ub = (k + 1) * w - w * gap * 0.5 * rng.uniform(0.5, 1.5)
        vmax = rng.uniform(len_min, len_max)
        cols = max(1, int(round(nu * (ub - ua))))
        rows = max(3, int(round(nv * (vmax - v_split))))
        amp = rng.uniform(0.004, 0.030)
        ph = rng.uniform(0, 6.28)
        dx = rng.uniform(-0.05, 0.05)
        span = max(1e-3, vmax - v_split)

        def wob(v, amp=amp, ph=ph, dx=dx, span=span):
            f_in = smooth((v - v_split) / 0.10)
            return Vector((dx * smooth((v - v_split) / span) + amp * math.sin(v * 14 + ph) * f_in,
                           amp * 0.6 * math.cos(v * 11 + ph) * f_in, 0.0))
        grid(ua, ub, v_split, vmax, cols, rows,
             tip=v_split + span * rng.uniform(0.55, 0.82),
             hem_from=v_split + span * (1.0 - hem_frac * rng.uniform(0.8, 1.3)), wob=wob)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    me.materials.append(mat_body)
    me.materials.append(mat_hem)
    return ob
