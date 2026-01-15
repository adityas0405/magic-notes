import 'package:flutter/material.dart';

class TokenEntryScreen extends StatefulWidget {
  const TokenEntryScreen({
    super.key,
    required this.onSave,
  });

  final ValueChanged<String> onSave;

  @override
  State<TokenEntryScreen> createState() => _TokenEntryScreenState();
}

class _TokenEntryScreenState extends State<TokenEntryScreen> {
  final TextEditingController _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleSave() {
    final token = _controller.text.trim();
    if (token.isEmpty) {
      setState(() => _error = 'Please paste a token to continue.');
      return;
    }
    widget.onSave(token);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Enter Access Token'),
        backgroundColor: const Color.fromARGB(255, 192, 158, 252),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Paste the access token issued by the Magic Notes web app.',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              Text(
                'This token is stored securely on the device and sent with '
                'each capture.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _controller,
                autocorrect: false,
                enableSuggestions: false,
                decoration: InputDecoration(
                  labelText: 'Access token',
                  border: const OutlineInputBorder(),
                  errorText: _error,
                ),
                minLines: 1,
                maxLines: 3,
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _handleSave,
                  child: const Text('Save Token'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
