// Soporte abierto para Arduino UNO R4 WiFi
// Medidas de contorno y centros de montaje basados en los archivos CAD
// oficiales Arduino ABX00087. Unidades: mm.

$fn = 48;

board_w = 68.58;
board_h = 53.34;
base_w = 96;
base_h = 82;
foot_h = 1.2;
foot_d = 10;
base_t = 3.2;
corner_chamfer = 4;
standoff_h = 8;
standoff_d = 9;
board_hole_d = 3.5;
nut_af = 5.8;
nut_trap_depth = 2.8;
base_fix_hole_d = 4.2;
base_fix_offset = 7;

inch = 25.4;
board_offset = [(base_w - board_w)/2, (base_h - board_h)/2];
board_holes = [
    [0.55*inch, 0.10*inch],
    [2.60*inch, 0.30*inch],
    [2.60*inch, 1.40*inch],
    [0.60*inch, 2.00*inch]
];
mounts = [for (p = board_holes) [p[0] + board_offset[0], p[1] + board_offset[1]]];
base_mounts = [
    [base_fix_offset, base_fix_offset],
    [base_w-base_fix_offset, base_fix_offset],
    [base_w-base_fix_offset, base_h-base_fix_offset],
    [base_fix_offset, base_h-base_fix_offset]
];

module chamfered_plate() {
    linear_extrude(height=base_t)
        polygon(points=[
            [corner_chamfer,0], [base_w-corner_chamfer,0],
            [base_w,corner_chamfer], [base_w,base_h-corner_chamfer],
            [base_w-corner_chamfer,base_h], [corner_chamfer,base_h],
            [0,base_h-corner_chamfer], [0,corner_chamfer]
        ]);
}

difference() {
    union() {
        translate([0,0,foot_h]) chamfered_plate();
        for (p = base_mounts)
            translate([p[0],p[1],0])
                cylinder(h=foot_h, d=foot_d);
        for (p = mounts)
            translate([p[0],p[1],foot_h+base_t])
                cylinder(h=standoff_h, d=standoff_d);
    }

    // M3 board screws, with nut pockets on the underside.
    for (p = mounts) {
        translate([p[0],p[1],-0.1])
            cylinder(h=foot_h+base_t+standoff_h+0.2, d=board_hole_d);
        translate([p[0],p[1],foot_h-0.01])
            cylinder(h=nut_trap_depth+0.01, d=2*nut_af/sqrt(3), $fn=6);
    }

    // Holes to fasten the support onto the physical model.
    for (p = base_mounts)
        translate([p[0],p[1],-0.1])
            cylinder(h=foot_h+base_t+0.2, d=base_fix_hole_d);
}

