import 'package:flutter/material.dart';

import '../models/models.dart';
import '../services/media_service.dart';
import '../theme/tokens.dart';

/// Compact attachment actions shared by report & proposal flows.
class AttachBar extends StatelessWidget {
  const AttachBar({
    super.key,
    required this.attachments,
    required this.onChanged,
    this.media,
    this.mode = AttachBarMode.full,
  });

  final List<AttachmentPin> attachments;
  final ValueChanged<List<AttachmentPin>> onChanged;
  final MediaService? media;

  /// Officer reports: photo + photo library only. Proposals keep file + location.
  final AttachBarMode mode;

  MediaService get _media => media ?? MediaService();

  Future<void> _add(BuildContext context, Future<AttachmentPin?> Function() pick) async {
    try {
      final pin = await pick();
      if (pin == null) return;
      onChanged([...attachments, pin]);
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final chips = <Widget>[
      _AttachChip(
        icon: Icons.photo_camera_outlined,
        label: '写真',
        onTap: () => _add(context, _media.takePhoto),
      ),
      if (mode == AttachBarMode.report) ...[
        const SizedBox(width: 8),
        _AttachChip(
          icon: Icons.folder_outlined,
          label: 'フォルダ',
          onTap: () => _add(context, _media.pickFromGallery),
        ),
      ] else ...[
        const SizedBox(width: 8),
        _AttachChip(
          icon: Icons.attach_file,
          label: 'ファイル',
          onTap: () => _add(context, _media.pickFile),
        ),
        const SizedBox(width: 8),
        _AttachChip(
          icon: Icons.place_outlined,
          label: '位置',
          onTap: () => _add(context, _media.pinLocation),
        ),
      ],
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(children: chips),
        if (attachments.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (var i = 0; i < attachments.length; i++)
                InputChip(
                  avatar: Icon(
                    switch (attachments[i].kind) {
                      AttachmentKind.camera => Icons.photo_camera_outlined,
                      AttachmentKind.file => mode == AttachBarMode.report
                          ? Icons.folder_outlined
                          : Icons.insert_drive_file_outlined,
                      AttachmentKind.location => Icons.place_outlined,
                    },
                    size: 16,
                    color: TnTokens.primary,
                  ),
                  label: Text(
                    attachments[i].label,
                    overflow: TextOverflow.ellipsis,
                  ),
                  onDeleted: () {
                    final next = [...attachments]..removeAt(i);
                    onChanged(next);
                  },
                ),
            ],
          ),
        ],
      ],
    );
  }
}

enum AttachBarMode { report, full }

class _AttachChip extends StatelessWidget {
  const _AttachChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: OutlinedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 18),
        label: Text(label),
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(42),
          padding: const EdgeInsets.symmetric(horizontal: 8),
          foregroundColor: TnTokens.primary,
        ),
      ),
    );
  }
}
