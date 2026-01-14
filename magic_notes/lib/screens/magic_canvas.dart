import 'package:flutter/material.dart';

import '../models/drawing.dart';
import '../services/api_service.dart';

class MagicCanvas extends StatefulWidget {
  const MagicCanvas({super.key, required this.apiService});

  final ApiService apiService;

  @override
  State<MagicCanvas> createState() => _MagicCanvasState();
}

class _MagicCanvasState extends State<MagicCanvas> {
  final List<Stroke> strokes = [];
  Stroke? currentStroke;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Magic Notebook'),
        backgroundColor: const Color.fromARGB(255, 192, 158, 252),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () {
              setState(() {
                strokes.clear();
              });

              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Page Cleared!')),
              );
            },
          ),
        ],
      ),
      body: Listener(
        onPointerDown: (details) {
          setState(() {
            currentStroke = Stroke([]);
            strokes.add(currentStroke!);
          });
        },
        onPointerMove: (details) {
          setState(() {
            final point = DrawingPoint(
              x: details.localPosition.dx,
              y: details.localPosition.dy,
              pressure: details.pressure,
              tilt: details.tilt,
            );
            currentStroke!.points.add(point);
          });
        },
        onPointerUp: (details) {
          setState(() {
            currentStroke = null;
          });
        },
        child: CustomPaint(
          painter: InkPainter(strokes),
          size: Size.infinite,
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          if (strokes.isEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Draw something first.')),
            );
            return;
          }

          try {
            final noteId = await widget.apiService.createNote(
              title: 'Captured Note',
              device: 'samsung-tab-s7',
            );
            await widget.apiService.uploadStrokes(noteId, strokes);
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Uploaded note #$noteId')),
            );
          } catch (error) {
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Failed to connect. Check backend.')),
            );
          }
        },
        child: const Icon(Icons.cloud_upload),
      ),
    );
  }
}

class InkPainter extends CustomPainter {
  InkPainter(this.strokes);

  final List<Stroke> strokes;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    for (final stroke in strokes) {
      if (stroke.points.isEmpty) continue;

      for (int i = 0; i < stroke.points.length - 1; i++) {
        final p1 = stroke.points[i];
        final p2 = stroke.points[i + 1];

        paint.strokeWidth = 2.0 + (p1.pressure * 4.0);

        canvas.drawLine(Offset(p1.x, p1.y), Offset(p2.x, p2.y), paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
