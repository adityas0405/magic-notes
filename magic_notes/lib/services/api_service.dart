import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/drawing.dart';
import '../models/note.dart';

class ApiService {
  ApiService({this.baseUrl = apiBaseUrl, String? authToken})
      : _authToken = authToken;

  final String baseUrl;
  String? _authToken;

  /// Example login flow:
  /// final response = await http.post(
  ///   Uri.parse('$baseUrl/api/auth/login'),
  ///   headers: {'Content-Type': 'application/json'},
  ///   body: jsonEncode({'email': email, 'password': password}),
  /// );
  /// final decoded = jsonDecode(response.body) as Map<String, dynamic>;
  /// apiService.setAuthToken(decoded['access_token'] as String);
  void setAuthToken(String token) {
    _authToken = token;
  }

  Map<String, String> _headers({bool json = true}) {
    final headers = <String, String>{};
    if (json) {
      headers['Content-Type'] = 'application/json';
    }
    if (_authToken != null && _authToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_authToken';
    }
    return headers;
  }

  Future<int> createNote({String? title, String? device, int? notebookId}) async {
    final payload = {
      'title': title,
      'device': device ?? 'samsung-tab-s7',
      'notebook_id': notebookId,
    }..removeWhere((key, value) => value == null);

    final response = await http.post(
      Uri.parse('$baseUrl/api/notes'),
      headers: _headers(),
      body: jsonEncode(payload),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to create note (${response.statusCode}).');
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    return decoded['id'] as int;
  }

  Future<void> uploadStrokes(int noteId, List<Stroke> strokes) async {
    final payload = {
      'strokes': strokes.map((s) => s.toJson()).toList(),
      'captured_at': DateTime.now().toIso8601String(),
    };

    final response = await http.post(
      Uri.parse('$baseUrl/api/notes/$noteId/strokes'),
      headers: _headers(),
      body: jsonEncode(payload),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to upload strokes (${response.statusCode}).');
    }
  }

  Future<List<NotebookSummary>> fetchNotebooks() async {
    final response =
        await http.get(Uri.parse('$baseUrl/api/library'), headers: _headers());
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load library (${response.statusCode}).');
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final notebooks = (decoded['notebooks'] as List<dynamic>? ?? []);
    return notebooks
        .map((notebook) => NotebookSummary.fromJson(notebook))
        .toList();
  }

  Future<List<NoteSummary>> fetchNotes(int notebookId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/notebooks/$notebookId/notes'),
      headers: _headers(),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load notes (${response.statusCode}).');
    }

    final decoded = jsonDecode(response.body) as List<dynamic>;
    return decoded.map((note) => NoteSummary.fromJson(note)).toList();
  }

  Future<NoteDetail> fetchNoteDetail(int noteId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/notes/$noteId'),
      headers: _headers(),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load note (${response.statusCode}).');
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    return NoteDetail.fromJson(decoded);
  }

  String resolveFileUrl(String fileUrl) {
    if (fileUrl.isEmpty) {
      return '';
    }

    final parsed = Uri.parse(fileUrl);
    if (parsed.hasScheme) {
      return fileUrl;
    }

    return Uri.parse(baseUrl).resolve(fileUrl).toString();
  }
}

class NotebookSummary {
  final int id;
  final String name;
  final String color;
  final String icon;
  final int noteCount;

  NotebookSummary({
    required this.id,
    required this.name,
    required this.color,
    required this.icon,
    required this.noteCount,
  });

  factory NotebookSummary.fromJson(Map<String, dynamic> json) {
    return NotebookSummary(
      id: json['id'] as int,
      name: (json['name'] as String?) ?? 'Notebook',
      color: (json['color'] as String?) ?? '#14b8a6',
      icon: (json['icon'] as String?) ?? 'Atom',
      noteCount: (json['note_count'] as num?)?.toInt() ?? 0,
    );
  }
}
