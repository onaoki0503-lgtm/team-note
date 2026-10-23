import 'package:file_picker/file_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';

import '../models/models.dart';

/// Camera, files, and location for reports / proposals / profile.
class MediaService {
  MediaService({ImagePicker? picker}) : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  Future<AttachmentPin?> takePhoto() async {
    final file = await _picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1920,
      imageQuality: 85,
    );
    if (file == null) return null;
    return AttachmentPin(
      kind: AttachmentKind.camera,
      label: file.name,
      path: file.path,
    );
  }

  Future<AttachmentPin?> pickFromGallery() async {
    final file = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1920,
      imageQuality: 85,
    );
    if (file == null) return null;
    return AttachmentPin(
      kind: AttachmentKind.camera,
      label: file.name,
      path: file.path,
    );
  }

  Future<AttachmentPin?> pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['pdf', 'png', 'jpg', 'jpeg', 'xlsx', 'csv', 'heic'],
    );
    if (result == null || result.files.isEmpty) return null;
    final f = result.files.first;
    return AttachmentPin(
      kind: AttachmentKind.file,
      label: f.name,
      path: f.path,
    );
  }

  Future<AttachmentPin?> pinLocation() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) {
      throw StateError('位置情報をオンにしてください');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw StateError('位置情報の許可が必要です');
    }

    final pos = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 12),
      ),
    );

    final label =
        '${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}';
    return AttachmentPin(
      kind: AttachmentKind.location,
      label: label,
      lat: pos.latitude,
      lng: pos.longitude,
    );
  }
}
