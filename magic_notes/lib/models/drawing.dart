class DrawingPoint {
  final double x;
  final double y;
  final double pressure;
  final double tilt;

  DrawingPoint({
    required this.x,
    required this.y,
    required this.pressure,
    required this.tilt,
  });

  Map<String, dynamic> toJson() {
    return {
      'x': double.parse(x.toStringAsFixed(1)),
      'y': double.parse(y.toStringAsFixed(1)),
      'p': double.parse(pressure.toStringAsFixed(3)),
      't': double.parse(tilt.toStringAsFixed(3)),
    };
  }
}

class Stroke {
  final List<DrawingPoint> points;
  Stroke(this.points);

  Map<String, dynamic> toJson() {
    return {
      'points': points.map((p) => p.toJson()).toList(),
    };
  }
}
