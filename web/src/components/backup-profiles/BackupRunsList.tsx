import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BackupRun } from '../../types';
import { formatDate } from '../../utils/format';
import { backupProfileApi, backupRunApi } from '../../api';

interface BackupRunsListProps {
  runs: BackupRun[];
}

function BackupRunsList({ runs }: BackupRunsListProps) {
  const navigate = useNavigate();
  const [profilesMap, setProfilesMap] = useState<Record<number, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const profiles = await backupProfileApi.list();
        const map = Object.fromEntries((profiles || []).map((p) => [p.id, p.name])) as Record<number, string>;
        setProfilesMap(map);
      } catch (e) {
        console.error('Error loading profiles for mapping:', e);
      }
    })();
  }, []);
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: 'Pending' },
      running: { color: 'info', text: 'Running' },
      success: { color: 'success', text: 'Success' },
      completed: { color: 'success', text: 'Completed' },
      failed: { color: 'error', text: 'Failed' },
      error: { color: 'error', text: 'Error' },
    };

    const key = status?.toLowerCase();
    const badge = Object.prototype.hasOwnProperty.call(badges, key)
      ? badges[key]
      : badges.pending;

    return (
      <Chip
        label={badge.text}
        color={badge.color as any}
        size="small"
      />
    );
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  if (runs.length === 0) {
    return (
      <Box textAlign="center" py={12}>
        <PlayArrowIcon sx={{ fontSize: 80, opacity: 0.5, mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No backup runs yet
        </Typography>
        <Typography color="text.secondary">
          Run a backup profile to see results here
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Profile</TableCell>
            <TableCell>Status</TableCell>
              <TableCell>Files</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {runs.map((run) => {
            const startTime = run.start_time || '';
            const endTime = run.end_time || '';

            let duration = '-';
            if (startTime) {
              if (endTime) {
                const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
                duration = Math.round(durationMs / 1000) + 's';
              } else if (run.status === 'running') {
                duration = 'Running...';
              }
            }

            return (
              <TableRow
                key={run.id}
                hover
                onClick={() => navigate(`/backup-runs/${run.id}`)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  }
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    #{run.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color="primary"
                    sx={{ textDecoration: 'underline', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/backup-profiles/${run.backup_profile_id}`);
                    }}
                  >
                    {profilesMap[run.backup_profile_id] ?? `Profile #${run.backup_profile_id}`}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    {getStatusBadge(run.status)}
                    {run.error_message && (
                      <Tooltip title={run.error_message}>
                        <Typography variant="caption" color="error" display="block" mt={0.5}>
                          Error: {run.error_message.substring(0, 50)}...
                        </Typography>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{run.total_files || 0}</TableCell>
                <TableCell>{formatSize(run.total_size_bytes || 0)}</TableCell>
                <TableCell>{formatDate(startTime)}</TableCell>
                <TableCell>{duration}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Delete backup run">
                    <IconButton
                      size="small"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Delete backup run #${run.id}? This will remove its records.`)) return;
                        try {
                          await backupRunApi.delete(run.id);
                          // Optimistically remove row by reloading page; parent list owns data
                          // If you prefer no reload, lift state update via parent onDeleted callback
                          navigate(0);
                        } catch (err) {
                          console.error('Failed to delete run:', err);
                        }
                      }}
                      aria-label={`Delete run #${run.id}`}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default BackupRunsList;
