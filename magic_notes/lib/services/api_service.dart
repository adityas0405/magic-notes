import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/drawing.dart';
import '../models/note.dart';

class ApiService {
  ApiService({
    this.baseUrl = API_BASE_URL,
    FlutterSecureStorage? secureStorage,
    String? authToken,
  })  : _secureStorage = secureStorage ?? const FlutterSecureStorage(),
        _authToken = authToken;

  final String baseUrl;
  final FlutterSecureStorage _secureStorage;
  String? _authToken;

  /// Persist + set the auth token (JWT).
  Future<void> setAuthToken(String token) async {
    _authToken = token;
    await _secureStorage.write(key: _storageTokenKey, value: token);
  }

  /// Load a persisted auth token (JWT) into memory.
  Future<void> loadAuthToken() async {
    final token = await _secureStorage.read(key: _storageTokenKey);
    if (token != null && token.isNotEmpty) {
      _authToken = token;
    }
  }

  /// Clear token from memory + storage (logout / reset).
  Future<void> clearAuthToken() async {
    _authToken = null;
    await _secureStorage.delete(key: _storageTokenKey);
  }

  /// Optional helper: is a token currently available?
  bool get hasAuthToken => _authToken != null && _authToken!.isNotEmpty;

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

  Future<int> createNote({String? deviceType, String? deviceId}) async {
    final uri = _buildUri('/api/notes');
    final payload = {
      'device_type': deviceType ?? 'tablet',
      'device_id': deviceId,
    }..removeWhere((key, value) => value == null);

    final response = await http.post(
      uri,
      headers: _headers(),
      body: jsonEncode(payload),
    );

    await _throwIfError(
      response,
      'Failed to create note',
    );

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    return decoded['id'] as int;
  }

  Future<void> uploadStrokes(int noteId, List<Stroke> strokes) async {
    final uri = _buildUri('/api/notes/$noteId/strokes');
    final payload = {
      'strokes': strokes.map((s) => s.toJson()).toList(),
      'captured_at': DateTime.now().toIso8601String(),
    };

    final response = await http.post(
      uri,
      headers: _headers(),
      body: jsonEncode(payload),
    );

    await _throwIfError(response, 'Failed to upload strokes');
  }

  Future<List<NotebookSummary>> fetchNotebooks() async {
    final response =
        await http.get(_buildUri('/api/library'), headers: _headers());

    await _throwIfError(response, 'Failed to load library');

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final notebooks = (decoded['notebooks'] as List<dynamic>? ?? []);
    return notebooks
        .map((notebook) => NotebookSummary.fromJson(notebook))
        .toList();
  }

  Future<List<NoteSummary>> fetchNotes(int notebookId) async {
    final response = await http.get(
      _buildUri('/api/notebooks/$notebookId/notes'),
      headers: _headers(),
    );

    await _throwIfError(response, 'Failed to load notes');

    final decoded = jsonDecode(response.body) as List<dynamic>;
    return decoded.map((note) => NoteSummary.fromJson(note)).toList();
  }

  Future<NoteDetail> fetchNoteDetail(int noteId) async {
    final response = await http.get(
      _buildUri('/api/notes/$noteId'),
      headers: _headers(),
    );

    await _throwIfError(response, 'Failed to load note');

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

  // --- helpers ---

  static const String _storageTokenKey = 'auth_token';

  Uri _buildUri(String path) {
    if (baseUrl.isEmpty) {
      throw StateError(
        'API base URL is not configured. '
        'Provide --dart-define=API_BASE_URL=https://your-api-host',
      );
    }
    final normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    return Uri.parse(baseUrl).resolve(normalizedPath);
  }

  Future<void> _throwIfError(http.Response response, String message) async {
    if (response.statusCode == 401) {
      await clearAuthToken();
      throw const ApiUnauthorizedException();
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        '$message (${response.statusCode}): ${_safeBody(response)}',
      );
    }
  }

  String _safeBody(http.Response response) {
    try {
      final body = response.body;
      if (body.isEmpty) return '';
      // Avoid huge logs
      return body.length > 500 ? '${body.substring(0, 500)}…' : body;
    } catch (_) {
      return '';
    }
  }
}

class ApiUnauthorizedException implements Exception {
  const ApiUnauthorizedException();
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
