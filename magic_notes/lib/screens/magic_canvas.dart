import 'package:flutter/material.dart';

import '../models/drawing.dart';
import '../services/api_service.dart';

class MagicCanvas extends StatefulWidget {
  const MagicCanvas({
    super.key,
    required this.apiService,
    required this.onRequestToken,
    required this.onAuthExpired,
  });

  final ApiService apiService;
  final VoidCallback onRequestToken;
  final VoidCallback onAuthExpired;

  @override
  State<MagicCanvas> createState() => _MagicCanvasState();
}

class _MagicCanvasState extends State<MagicCanvas> {
  final List<Stroke> strokes = [];
  Stroke? currentStroke;
  String statusMessage = 'Ready to capture.';

  @override
  Widget build(BuildContext context) {
    final hasToken = widget.apiService.hasAuthToken;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Magic Notebook'),
        backgroundColor: const Color.fromARGB(255, 192, 158, 252),
        actions: [
          TextButton.icon(
            onPressed: widget.onRequestToken,
            icon: const Icon(Icons.key, color: Colors.white),
            label: const Text(
              'Change Token',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Listener(
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
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: Colors.grey.shade200),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    hasToken
                        ? statusMessage
                        : 'No auth token set. Tap "Change Token" in the top bar.',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: Colors.grey.shade700),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      OutlinedButton.icon(
                        onPressed: () {
                          setState(() {
                            strokes.clear();
                            statusMessage = 'Canvas cleared.';
                          });
                        },
                        icon: const Icon(Icons.delete_outline),
                        label: const Text('Clear'),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () async {
                            if (!widget.apiService.hasAuthToken) {
                              setState(() {
                                statusMessage =
                                    'Missing token. Tap "Change Token" first.';
                              });
                              return;
                            }

                            if (strokes.isEmpty) {
                              setState(() {
                                statusMessage = 'Draw something first.';
                              });
                              return;
                            }

                            setState(() {
                              statusMessage = 'Sending your note...';
                            });

                            try {
                              final noteId =
                                  await widget.apiService.createNote(
                                deviceType: 'tablet',
                              );
                              await widget.apiService
                                  .uploadStrokes(noteId, strokes);

                              if (!mounted) return;
                              setState(() {
                                statusMessage = 'Uploaded note #$noteId';
                              });
                            } catch (error) {
                              if (error is ApiUnauthorizedException) {
                                if (mounted) {
                                  setState(() {
                                    statusMessage =
                                        'Token expired. Please re-enter.';
                                  });
                                }
                                widget.onAuthExpired();
                                return;
                              }
                              if (!mounted) return;
                              setState(() {
                                statusMessage =
                                    'Upload failed (auth or backend).';
                              });
                            }
                          },
                          icon: const Icon(Icons.cloud_upload),
                          label: const Text('Send'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
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
